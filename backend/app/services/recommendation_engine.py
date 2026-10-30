from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import Room, Booking, Equipment
from app.services.conflict_validator import check_room_availability, is_time_overlapping

def calculate_suitability_score(
    room: Room,
    requested_capacity: int,
    requested_equipment: List[str],
    acoustic_preference: Optional[str]
) -> tuple[float, List[str]]:
    """
    Computes a deterministic rule-based score (0 - 100) and highlight tags.
    Does not use machine learning.
    """
    reasons = []
    
    # 1. Capacity Score (Weight: 35%)
    if room.capacity < requested_capacity:
        capacity_score = 0
    else:
        # Penalize excessive over-capacity to optimize campus resources
        ratio = room.capacity / max(requested_capacity, 1)
        if ratio <= 1.25:
            capacity_score = 100
            reasons.append("Perfect capacity match")
        elif ratio <= 1.75:
            capacity_score = 85
            reasons.append("Comfortable capacity")
        elif ratio <= 3.0:
            capacity_score = 65
            reasons.append("Spacious venue")
        else:
            capacity_score = 40
            reasons.append("High-capacity venue")

    # 2. Equipment Match Score (Weight: 35%)
    room_eq_names = {eq.name.lower() for eq in room.equipment_items}
    if not requested_equipment:
        equipment_score = 100
    else:
        matched = sum(1 for req in requested_equipment if req.lower() in room_eq_names)
        equipment_score = (matched / len(requested_equipment)) * 100
        if matched == len(requested_equipment):
            reasons.append("All requested equipment available")
        elif matched > 0:
            reasons.append(f"Partial equipment match ({matched}/{len(requested_equipment)})")

    # 3. Acoustic Profile Score (Weight: 30%)
    if not acoustic_preference:
        acoustic_score = 100
    elif room.acoustic_profile == acoustic_preference:
        acoustic_score = 100
        reasons.append(f"Ideal acoustic profile ({room.acoustic_profile})")
    elif acoustic_preference == "Silent Study Zone":
        if room.acoustic_profile == "Collaborative Discussion":
            acoustic_score = 40
        else:
            acoustic_score = 10
    elif acoustic_preference == "Amplified Sound Permitted":
        if room.acoustic_profile == "Collaborative Discussion":
            acoustic_score = 50
        else:
            acoustic_score = 10
    else:
        acoustic_score = 60

    total_score = (0.35 * capacity_score) + (0.35 * equipment_score) + (0.30 * acoustic_score)
    return round(total_score, 1), reasons


def get_smart_recommendations(
    db: Session,
    requested_capacity: int,
    booking_date: str,
    start_time: str,
    end_time: str,
    required_equipment: List[str] = [],
    acoustic_preference: Optional[str] = None,
    limit: int = 6
) -> Dict[str, Any]:
    """
    Finds exact slot recommendations and alternative time/room suggestions.
    """
    all_rooms = db.query(Room).filter(Room.is_active == True).all()
    
    exact_matches = []
    alternative_slots = []
    
    # Alternative time shifts to test if slots are busy
    time_shifts = [
        ("+1 Hour", _shift_time(start_time, 60), _shift_time(end_time, 60)),
        ("+2 Hours", _shift_time(start_time, 120), _shift_time(end_time, 120)),
        ("-1 Hour", _shift_time(start_time, -60), _shift_time(end_time, -60)),
    ]

    for room in all_rooms:
        # Check maintenance
        if room.status in ["UNDER_MAINTENANCE", "TEMPORARILY_UNAVAILABLE"]:
            continue
            
        is_avail, _ = check_room_availability(db, room.id, booking_date, start_time, end_time)
        score, tags = calculate_suitability_score(room, requested_capacity, required_equipment, acoustic_preference)
        
        room_data = {
            "room_id": room.id,
            "room_number": room.room_number,
            "name": room.name,
            "building": room.building,
            "floor": room.floor,
            "capacity": room.capacity,
            "acoustic_profile": room.acoustic_profile,
            "status": room.status,
            "latitude": room.latitude,
            "longitude": room.longitude,
            "image_url": room.image_url,
            "equipment": [eq.name for eq in room.equipment_items],
            "suitability_score": score,
            "match_highlights": tags
        }

        if is_avail and room.capacity >= requested_capacity:
            exact_matches.append(room_data)
        elif not is_avail:
            # Check alternative time slots for this room
            for label, alt_s, alt_e in time_shifts:
                if alt_s and alt_e:
                    alt_avail, _ = check_room_availability(db, room.id, booking_date, alt_s, alt_e)
                    if alt_avail:
                        alt_copy = dict(room_data)
                        alt_copy["suggested_time_slot"] = f"{alt_s} - {alt_e}"
                        alt_copy["slot_shift_label"] = label
                        alt_copy["alternative_reason"] = f"Original slot booked. Available {label.lower()} ({alt_s}-{alt_e})"
                        alternative_slots.append(alt_copy)
                        break

    # Sort exact matches by score descending
    exact_matches.sort(key=lambda x: x["suitability_score"], reverse=True)
    alternative_slots.sort(key=lambda x: x["suitability_score"], reverse=True)

    return {
        "exact_matches": exact_matches[:limit],
        "alternative_slots": alternative_slots[:4],
        "total_exact_found": len(exact_matches),
        "total_alternatives_found": len(alternative_slots)
    }

def _shift_time(time_str: str, delta_minutes: int) -> Optional[str]:
    """Helper to shift HH:MM by minutes within 08:00 to 21:00 campus hours."""
    try:
        parts = time_str.split(":")
        h = int(parts[0])
        m = int(parts[1])
        total_m = h * 60 + m + delta_minutes
        new_h = total_m // 60
        new_m = total_m % 60
        if 8 <= new_h <= 20:
            return f"{new_h:02d}:{new_m:02d}"
        return None
    except Exception:
        return None
