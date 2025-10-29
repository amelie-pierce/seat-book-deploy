import React, { useState } from "react";
import { Box, IconButton, Typography, Avatar } from "@mui/material";
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
  timeSlots?: {
    am: boolean;
    pm: boolean;
    isCurrentUser: boolean;
    amIsCurrentUser?: boolean;
    pmIsCurrentUser?: boolean;
    timeSlot?: "AM" | "PM" | "FULL_DAY";
  };
}

function SeatButton({
  position,
  leftPosition,
  onClick,
  isAvailable = true,
  seatNumber,
  seatId,
  selected = false,
  bookedByUser,
  timeSlots = {
    am: false,
    pm: false,
    isCurrentUser: false,
    amIsCurrentUser: false,
    pmIsCurrentUser: false,
  },
}: SeatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isPartiallyBooked = timeSlots.am !== timeSlots.pm;
  const isFullyBooked = timeSlots.am && timeSlots.pm;
  
  // Check if the seat is booked (either AM, PM, or FULL_DAY)
  const isBooked = timeSlots.am || timeSlots.pm;

  const getLeftColor = (timeSlot: {
    am: boolean;
    pm: boolean;
    isCurrentUser: boolean;
    amIsCurrentUser?: boolean;
    pmIsCurrentUser?: boolean;
    timeSlot?: "AM" | "PM" | "FULL_DAY";
  }) => {
    // For AM slots (left half represents AM)
    if (timeSlot.am && timeSlot.amIsCurrentUser) {
      return "#FF5208"; // Red for current user's AM bookings
    }
    if (timeSlot.am) {
      return "#CDCFD0"; // Gray for other users' AM bookings
    }
    return "white"; // White for unbooked AM
  };

  const getRightColor = (timeSlot: {
    am: boolean;
    pm: boolean;
    isCurrentUser: boolean;
    amIsCurrentUser?: boolean;
    pmIsCurrentUser?: boolean;
    timeSlot?: "AM" | "PM" | "FULL_DAY";
  }) => {
    // For PM slots (right half represents PM)
    if (timeSlot.pm && timeSlot.pmIsCurrentUser) {
      return "#FF5208"; // Red for current user's PM bookings
    }
    if (timeSlot.pm) {
      return "#CDCFD0"; // Gray for other users' PM bookings
    }
    return "white"; // White for unbooked PM
  };

  return (
    <IconButton
      data-seat-id={seatId}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        backgroundColor: isBooked ? 'primary.main' : '#61BF76',
        "&:hover": {
          backgroundColor: '#FF5208',
        },
      }}
    // disabled={!isAvailable && !timeSlots.isCurrentUser}
    >
      {/* <Box
        className="seat-half left"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          transition: "background-color 0.2s",
          backgroundColor: getLeftColor(timeSlots),
        }}
      />
      <Box
        className="seat-half right"
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          backgroundColor: getRightColor(timeSlots),
          transition: "background-color 0.2s",
        }}
      /> */}
      {isBooked && bookedByUser ? (
        // Show user avatar when seat is booked
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
