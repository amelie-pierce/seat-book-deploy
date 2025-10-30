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
  bookedByUsers?: {
    am?: string; // User ID who booked AM slot
    pm?: string; // User ID who booked PM slot
  };
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
  isAvailable = true, // eslint-disable-line @typescript-eslint/no-unused-vars
  seatNumber,
  seatId,
  selected = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  bookedByUser,
  bookedByUsers,
  timeSlots = {
    am: false,
    pm: false,
    isCurrentUser: false,
    amIsCurrentUser: false,
    pmIsCurrentUser: false,
  },
}: SeatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if the seat is booked (either AM, PM, or FULL_DAY)
  const isBooked = timeSlots.am || timeSlots.pm;
  
  // Check if seat is booked by two different users (one for AM, one for PM)
  const hasTwoUsers = bookedByUsers && bookedByUsers.am && bookedByUsers.pm && bookedByUsers.am !== bookedByUsers.pm;

  // Check if it's a half-day booking (only AM or only PM, not both)
  const isAMOnly = timeSlots.am && !timeSlots.pm;
  const isPMOnly = !timeSlots.am && timeSlots.pm;

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
      {hasTwoUsers ? (
        // Show both avatars side by side when seat is booked by two different users
        <Box
          sx={{
            display: "flex",
            width: "100%",
            height: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left half - AM user (show left half of avatar) */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Avatar
              src={userAvatar[bookedByUsers!.am!]}
              sx={{
                width: 41,
                height: 41,
                fontSize: '0.75rem',
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {bookedByUsers!.am!.charAt(0)}
            </Avatar>
          </Box>
          {/* Right half - PM user (show right half of avatar) */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Avatar
              src={userAvatar[bookedByUsers!.pm!]}
              sx={{
                width: 41,
                height: 41,
                fontSize: '0.75rem',
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {bookedByUsers!.pm!.charAt(0)}
            </Avatar>
          </Box>
        </Box>
      ) : isBooked && bookedByUser && isAMOnly ? (
        // Show left half of avatar for AM-only booking
        <Box
          sx={{
            display: "flex",
            width: "100%",
            height: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left half - AM user */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Avatar
              src={userAvatar[bookedByUser]}
              sx={{
                width: 41,
                height: 41,
                fontSize: '0.75rem',
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {bookedByUser.charAt(0)}
            </Avatar>
          </Box>
          {/* Right half - empty/gray */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
            }}
          />
        </Box>
      ) : isBooked && bookedByUser && isPMOnly ? (
        // Show right half of avatar for PM-only booking
        <Box
          sx={{
            display: "flex",
            width: "100%",
            height: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left half - empty/gray */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
            }}
          />
          {/* Right half - PM user */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Avatar
              src={userAvatar[bookedByUser]}
              sx={{
                width: 41,
                height: 41,
                fontSize: '0.75rem',
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {bookedByUser.charAt(0)}
            </Avatar>
          </Box>
        </Box>
      ) : isBooked && bookedByUser ? (
        // Show full avatar for FULL_DAY booking (both AM and PM by same user)
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
