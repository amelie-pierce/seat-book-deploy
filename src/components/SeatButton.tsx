import React, { useState } from "react";
import { IconButton, Typography, Avatar } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

const userAvatar = {
  1234: 'https://i.ibb.co/MkT31s77/408-Minh-Nguyen.jpg',
  "U001": 'https://i.ibb.co/8nhwmzLC/428-Dung-Huynh.jpg',
  "U002": 'https://i.ibb.co/My7pW5vQ/418-Huy-Vu.jpg',
  "U003": 'https://i.ibb.co/SXXwNf97/434-Mai-Tien.jpg',
  "U004": 'https://i.ibb.co/tT88X1D4/435-Nghia-Nguyen.jpg',
  "U005": 'https://i.ibb.co/9mR4Zq7N/416-Thao-Nguyen.jpg',
  "U006": 'https://i.ibb.co/JWckxF8d/422-Hoai-Nguyen.jpg',
  "U007": 'https://i.ibb.co/mr3hw0n3/436-Tien-Nguyen.jpg',
  "U008": 'https://i.ibb.co/zWV11c6Z/415-Quoc-Nguyen.jpg',
  "U009": 'https://i.ibb.co/QFDHr77c/445-Thien-Truong.jpg',
  "U010": 'https://i.ibb.co/5ZNdVv8/444-Khanh-Dao.jpg',
} as { [key: string]: string };

interface SeatButtonProps {
  position: "top" | "bottom" | "left" | "right";
  leftPosition: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isAvailable?: boolean;
  seatNumber?: number;
  seatId?: string;
  selected?: boolean;
  bookedByUser?: string; // User ID who booked the seat
  currentUser?: string; // Current logged-in user ID
  isWeekend?: boolean; // Flag to disable seat on weekends
}

function SeatButton({
  position,
  leftPosition,
  onClick,
  isAvailable = true, // eslint-disable-line @typescript-eslint/no-unused-vars
  seatNumber,
  seatId,
  selected = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  bookedByUser,
  currentUser,
  isWeekend = false,
}: SeatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if the seat is booked (full day only)
  const isBooked = !!bookedByUser;
  
  // Check if booked by current user
  const isBookedByCurrentUser = bookedByUser === currentUser;

  // Disable seat if it's weekend
  const isDisabled = isWeekend;

  return (
    <IconButton
      data-seat-id={seatId}
      onClick={(e) => {
        if (!isDisabled && onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isDisabled}
      sx={{
        position: "absolute",
        ...(position === "top" || position === "bottom" 
          ? {
              [position]: -25,
              left: leftPosition,
              transform: "translateX(-50%)",
            }
          : {
              [position]: -25,
              top: leftPosition,
              transform: "translateY(-50%)",
            }
        ),
        width: 50,
        height: 50,
        padding: 0,
        overflow: "hidden",
        // border: `2px solid #CDCFD0`,
        backgroundColor: isDisabled ? '#D1D5DB' : (isBooked ? (isBookedByCurrentUser ? '#F5A623' : '#CDCFD0') : '#61BF76'),
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        "&:hover": {
          backgroundColor: isDisabled ? '#D1D5DB' : '#FF5208',
        },
        "&.Mui-disabled": {
          backgroundColor: '#D1D5DB',
          opacity: 0.5,
        },
      }}
        // disabled={!isAvailable && !timeSlots.isCurrentUser}
    >
      {isBooked && bookedByUser ? (
        // Show full avatar for full-day booking
        <Avatar
          src={userAvatar[bookedByUser]}
          sx={{
            width: 41,
            height: 41,
            fontSize: '0.75rem',
            position: "relative",
            zIndex: 1,
          }}
        >
          {bookedByUser.charAt(0)}
        </Avatar>
      ) : isHovered ? (
        // Show plus icon on hover when seat is not booked
        <FontAwesomeIcon
          icon={faPlus}
          style={{
            position: "relative",
            zIndex: 1,
            color: "#fff",
            fontSize: "1.25rem",
          }}
        />
      ) : (
        // Show seat number when not booked and not hovered
        <Typography
          variant="body2"
          sx={{
            position: "relative",
            zIndex: 1,
            color: "#fff",
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          {seatNumber}
        </Typography>
      )}
    </IconButton>
  );
}

export default React.memo(SeatButton);
