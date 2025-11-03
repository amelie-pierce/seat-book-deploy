import React, { useState } from "react";
import { IconButton, Typography, Avatar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const userAvatar = {
  1234: 'https://i.pravatar.cc/150?img=1',
  "U001": 'https://i.pravatar.cc/150?img=2',
  "U002": 'https://i.pravatar.cc/150?img=3',
  "U003": 'https://i.pravatar.cc/150?img=4',
  "U004": 'https://i.pravatar.cc/150?img=5',
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
        <AddIcon
          sx={{
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
