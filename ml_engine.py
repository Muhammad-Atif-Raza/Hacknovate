import logging
from datetime import datetime, timedelta
from typing import List
import numpy as np
from sklearn.linear_model import Ridge
from sqlalchemy.orm import Session

from models import Space, Reservation, ReservationStatus, AcousticProfile, get_ist_now
from schemas import MLSuggestedSlotResponse, SpaceResponse

logger = logging.getLogger(__name__)


class SmartSlotMLModel:
    """
    Self-contained scikit-learn regression model for scoring campus room congestion
    and calculating booking success probability.
    """

    def __init__(self):
        self.model = Ridge(alpha=1.0)
        self._train_initial_model()

    def _train_initial_model(self):
        """
        Calibrate regression model on simulated campus booking patterns:
        Features:
          1. hour_of_day (0 - 23)
          2. is_peak_hour (1 if 11am-4pm, else 0)
          3. day_of_week (0 - 6)
          4. campus_occupancy_ratio (0.0 - 1.0)
          5. availability_ratio (0.0 - 1.0)
        Target:
          Congestion Score (0.0 to 1.0)
        """
        np.random.seed(42)
        n_samples = 300

        hours = np.random.randint(8, 22, size=n_samples)
        is_peak = np.where((hours >= 11) & (hours <= 16), 1.0, 0.0)
        days = np.random.randint(0, 7, size=n_samples)
        occupancy = np.random.uniform(0.1, 0.95, size=n_samples)
        avail_ratio = np.random.uniform(0.0, 1.0, size=n_samples)

        # Ground truth congestion formula with realistic campus weights
        y = (
            0.30 * (hours / 24.0)
            + 0.25 * is_peak
            + 0.10 * (days < 5).astype(float)  # higher on weekdays
            + 0.35 * occupancy
            - 0.30 * avail_ratio
            + np.random.normal(0, 0.05, size=n_samples)
        )
        y = np.clip(y, 0.05, 0.95)

        X = np.column_stack([hours, is_peak, days, occupancy, avail_ratio])
        self.model.fit(X, y)
        logger.info("SmartSlotMLModel calibrated with scikit-learn Ridge regression.")

    def predict_congestion(
        self,
        slot_start: datetime,
        campus_occupancy_ratio: float,
        avail_ratio: float,
    ) -> float:
        """Predicts congestion score between 0.0 and 1.0."""
        hour = slot_start.hour
        is_peak = 1.0 if 11 <= hour <= 16 else 0.0
        day = slot_start.weekday()

        features = np.array([[hour, is_peak, day, campus_occupancy_ratio, avail_ratio]])
        predicted = float(self.model.predict(features)[0])
        return float(np.clip(predicted, 0.05, 0.95))


# Singleton ML model instance
ml_predictor = SmartSlotMLModel()


def suggest_optimal_slots(
    db: Session,
    requested_capacity: int,
    requested_start: datetime,
    requested_end: datetime,
    acoustic_profile: AcousticProfile,
    limit: int = 3,
) -> List[MLSuggestedSlotResponse]:
    """
    ML Smart Slot Suggester:
    When primary search yields 0 rooms, generates candidate offset windows
    (+/- 1h, +2h, +3h, next day same time, next day +2h), verifies DB availability,
    runs scikit-learn regression scoring, and returns the top 3 optimal slots.
    """
    duration = requested_end - requested_start

    # Fetch total spaces in campus for occupancy ratio baseline
    total_spaces_count = db.query(Space).count() or 1

    # Fetch all spaces matching capacity and acoustic requirements
    matching_spaces = (
        db.query(Space)
        .filter(
            Space.capacity >= requested_capacity,
            Space.acoustic_profile == acoustic_profile,
        )
        .all()
    )

    if not matching_spaces:
        # If no spaces match even without time constraints, try relaxing capacity slightly
        matching_spaces = (
            db.query(Space)
            .filter(Space.acoustic_profile == acoustic_profile)
            .all()
        )

    # Candidate time slot variations
    candidate_offsets = [
        timedelta(hours=-1),
        timedelta(hours=1),
        timedelta(hours=2),
        timedelta(hours=3),
        timedelta(days=1),
        timedelta(days=1, hours=2),
        timedelta(days=1, hours=-2),
    ]

    candidate_slots = []
    now = get_ist_now()

    active_statuses = [
        ReservationStatus.PENDING_PERMISSION,
        ReservationStatus.BOOKED,
        ReservationStatus.SCANNED,
    ]

    for offset in candidate_offsets:
        cand_start = requested_start + offset
        cand_end = cand_start + duration

        # Avoid suggesting slots in the past
        if cand_start < now - timedelta(minutes=10):
            continue

        # Check campus-wide active reservations during candidate window
        campus_active_count = (
            db.query(Reservation)
            .filter(
                Reservation.status.in_(active_statuses),
                Reservation.start_time < cand_end,
                Reservation.end_time > cand_start,
            )
            .count()
        )
        campus_occupancy_ratio = min(1.0, campus_active_count / total_spaces_count)

        # Check which matching spaces are free during this candidate window
        busy_space_ids = {
            res.space_id
            for res in db.query(Reservation.space_id)
            .filter(
                Reservation.status.in_(active_statuses),
                Reservation.start_time < cand_end,
                Reservation.end_time > cand_start,
            )
            .all()
        }

        free_spaces = [s for s in matching_spaces if s.id not in busy_space_ids]

        if free_spaces:
            avail_ratio = len(free_spaces) / max(1, len(matching_spaces))
            congestion_score = ml_predictor.predict_congestion(
                cand_start, campus_occupancy_ratio, avail_ratio
            )
            success_prob = float(np.clip(1.0 - congestion_score, 0.10, 0.98))

            reason = (
                f"{len(free_spaces)} room(s) available. Predicted "
                f"{'low' if congestion_score < 0.4 else 'moderate'} congestion "
                f"({int(success_prob * 100)}% success probability)."
            )

            candidate_slots.append(
                MLSuggestedSlotResponse(
                    suggested_start=cand_start,
                    suggested_end=cand_end,
                    congestion_score=round(congestion_score, 2),
                    success_probability=round(success_prob, 2),
                    available_spaces=[SpaceResponse.model_validate(s) for s in free_spaces],
                    reason=reason,
                )
            )

    # Sort candidates by highest success probability (lowest congestion)
    candidate_slots.sort(key=lambda x: (-x.success_probability, x.congestion_score))

    return candidate_slots[:limit]
