from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.schemas.room import RoomSearchRequest
from app.services.recommendation_engine import get_smart_recommendations

router = APIRouter(prefix="/recommendations", tags=["Smart Recommendations"])

@router.post("")
def recommend_rooms(
    search_req: RoomSearchRequest,
    db: Session = Depends(get_db)
):
    results = get_smart_recommendations(
        db=db,
        requested_capacity=search_req.number_of_people,
        booking_date=search_req.booking_date,
        start_time=search_req.start_time,
        end_time=search_req.end_time,
        required_equipment=search_req.required_facilities,
        acoustic_preference=search_req.acoustic_preference
    )
    return results

@router.get("")
def recommend_rooms_get(
    number_of_people: int = Query(..., ge=1),
    booking_date: str = Query(...),
    start_time: str = Query(...),
    end_time: str = Query(...),
    facilities: Optional[str] = Query(None, description="Comma-separated equipment"),
    acoustic_preference: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    facility_list = [f.strip() for f in facilities.split(",")] if facilities else []
    results = get_smart_recommendations(
        db=db,
        requested_capacity=number_of_people,
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        required_equipment=facility_list,
        acoustic_preference=acoustic_preference
    )
    return results
