import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { ZoomIn, ZoomOut, CenterFocusStrong, Menu as MenuIcon } from "@mui/icons-material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useMemo, useRef } from "react";
import Image from "next/image";
import Table from "./Table";
import ZoneButton from "./ZoneButton";
import { SeatingConfig } from "../config/seatingConfig";

interface SeatingLayoutProps {
  onSeatClick?: (seatId: string) => void;
  availableSeats?: string[];
  selectedSeat?: string;
  selectedSeatsFromDropdown?: { [date: string]: string };
  seatingConfig: SeatingConfig;
  selectedDate?: string;
  onDateClick?: (date: string) => void;
  bookedSeats?: Array<{
    seatId: string;
    userId: string;
    timeSlot: "AM" | "PM" | "FULL_DAY";
  }>;
  currentUser?: string;
  timeSlot?: "AM" | "PM" | "FULL_DAY";
  onToggleDrawer?: () => void;
  showDrawerToggle?: boolean;
}

export default function SeatingLayout({
  onSeatClick,
  availableSeats,
  selectedSeat,
  selectedSeatsFromDropdown = {},
  seatingConfig,
  selectedDate,
  onDateClick,
  bookedSeats = [],
  currentUser,
  timeSlot,
  onToggleDrawer,
  showDrawerToggle = false,
}: SeatingLayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);

  // Memoize zone-based table organization
  const zoneOrganization = useMemo(() => {
    const zone1Tables = seatingConfig.zones.zone1.tables;
    const zone2Tables = seatingConfig.zones.zone2.tables;

    // Create zone 1 tables (horizontally aligned)
    const zone1Data = zone1Tables.map((tableLetter, index) => ({
      id: `zone1-table-${index}`,
      tableLetter,
      zone: "zone1" as const,
    }));

    // Create zone 2 tables (horizontally aligned)
    const zone2Data = zone2Tables.map((tableLetter, index) => ({
      id: `zone2-table-${index}`,
      tableLetter,
      zone: "zone2" as const,
    }));

    return {
      zone1: zone1Data,
      zone2: zone2Data,
    };
  }, [seatingConfig.zones]);

  // Handle zone focus (zoom/center only, no highlighting)
  const handleZoneFocus = (zone: "zone1" | "zone2" | "meeting", zoomToElement: (element: HTMLElement, scale: number, duration: number) => void) => {
    const seatElement = document.getElementById(`seating-${zone}`);
    if (seatElement) {
      zoomToElement(seatElement as HTMLElement, 0.5, 500);
    }
  };

  // Helper function to convert local date to YYYY-MM-DD string without timezone issues
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Memoize date chips generation to avoid recalculating on every render
  const dateChips = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    const dates: Date[] = [];

    // Check if it's after 3 PM on Friday
    const isAfterFridayDeadline = currentDay === 5 && currentHour >= 15; // Friday and >= 3 PM

    if (isAfterFridayDeadline) {
      // Show next week's working days (Monday to Friday)
      const nextMonday = new Date(today);
      const daysUntilNextMonday = (8 - currentDay) % 7; // Days until next Monday
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);

      for (let i = 0; i < 5; i++) {
        const date = new Date(nextMonday);
        date.setDate(nextMonday.getDate() + i);
        dates.push(date);
      }
    } else {
      // Show current week's working days (Monday to Friday)
      const monday = new Date(today);
      const daysFromMonday = (currentDay + 6) % 7; // Calculate days since Monday
      monday.setDate(today.getDate() - daysFromMonday);

      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
      }
    }

    return {
      dates,
      today,
      isAfterFridayDeadline,
    };
  }, []); // Only recalculate when component mounts

  // Compute the effective selected seat - prioritize user's booked seat for current date
  const effectiveSelectedSeat = useMemo(() => {
    if (selectedDate && currentUser) {
      // Find the seat booked by current user for the selected date
      const userBookingForDate = bookedSeats.find(
        booking => booking.userId === currentUser
      );
      if (userBookingForDate) {
        return userBookingForDate.seatId;
      }
    }

    // Fallback to dropdown selection or clicked seat
    if (selectedDate && selectedSeatsFromDropdown[selectedDate]) {
      return selectedSeatsFromDropdown[selectedDate];
    }

    return selectedSeat || null;
  }, [selectedDate, currentUser, bookedSeats, selectedSeatsFromDropdown, selectedSeat]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        alignItems: "center",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Date header chips - full width and sticky at top */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          background: "#efefef",
          position: "sticky",
          top: 0,
          zIndex: 100,
          overflowX: "auto",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flex: 1, alignItems: "flex-start" }}>
          {dateChips.dates.map((date) => {
            const dateStr = formatLocalDate(date);
            const isCurrentDate = dateStr === selectedDate;
            // console.log('date', date, 'datestring', dateStr);

            // Check if date is in the past (same logic as ReservationForm)
            const isPastDate =
              !dateChips.isAfterFridayDeadline && date < dateChips.today;

            return (
              <Chip
                icon={<EventNoteIcon fontSize="small" color="inherit" />}
                clickable={!isPastDate}
                key={dateStr}
                label={date.toLocaleDateString()}
                sx={{
                  cursor: isPastDate ? "not-allowed" : "pointer",
                  opacity: isPastDate ? 0.5 : 1,
                  fontSize: "0.875rem",
                  borderRadius: 1,
                  color: isCurrentDate ? "#fff" : "#1C262C",
                  backgroundColor: isCurrentDate ? "primary.main" : "#fff",
                  fontWeight: 600,
                }}
                onClick={
                  onDateClick && !isPastDate
                    ? () => onDateClick(dateStr)
                    : undefined
                }
              />
            );
          })}
        </Box>

        {/* Drawer Toggle Button - Only show on desktop when enabled */}
        {showDrawerToggle && onToggleDrawer && (
          <IconButton
            onClick={onToggleDrawer}
            sx={{
              color: "#000000",
              borderRadius: 1,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>
      {/* Zoomable tables section */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          overflow: "hidden",
          position: "relative",
          minHeight: 400,
        }}
      >
        <TransformWrapper
          ref={transformRef}
          initialScale={0.5}
          minScale={0.2}
          maxScale={3}
          wheel={{
            step: 0.1,
          }}
          pinch={{
            step: 0.1,
          }}
          limitToBounds={false}
          doubleClick={{
            disabled: false,
            mode: "reset",
          }}
          panning={{
            velocityDisabled: true,
          }}
        >
          {({ zoomIn, zoomOut, zoomToElement }) => (
            <>
              {/* Zone Focus Controls */}
              <Box
                sx={{
                  position: "absolute",
                  top: 20,
                  right: 10,
                  zIndex: 1000,
                  display: "flex",
                  gap: 2,
                  padding: 1,
                }}
              >
                <ZoneButton
                  label="Zone A"
                  onClick={() => handleZoneFocus("zone1", zoomToElement)}
                />
                <ZoneButton
                  label="Zone B"
                  onClick={() => handleZoneFocus("zone2", zoomToElement)}
                />
                <ZoneButton
                  label="Full Map"
                  onClick={() => handleZoneFocus("meeting", zoomToElement)}
                />
              </Box>
              {/* Zoom Control Buttons */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#fff",
                  borderRadius: "50px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <Tooltip title="Zoom In" placement="left">
                  <IconButton
                    onClick={() => zoomIn(0.2)}
                    sx={{
                      borderRadius: 0,
                      width: 48,
                      height: 48,
                      color: "#000",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <ZoomIn />
                  </IconButton>
                </Tooltip>

                {/* Horizontal Divider */}
                <Box
                  sx={{
                    height: "1px",
                    backgroundColor: "#e0e0e0",
                    mx: 1.5,
                  }}
                />

                <Tooltip title="Zoom Out" placement="left">
                  <IconButton
                    onClick={() => zoomOut(0.2)}
                    sx={{
                      borderRadius: 0,
                      width: 48,
                      height: 48,
                      color: "#000",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Zoom to Selected Seat Button */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 136,
                  right: 16,
                  zIndex: 10,
                }}
              >
                <Tooltip title={effectiveSelectedSeat ? "Zoom to Selected Seat" : "No Seat Selected"} placement="left">
                  <span>
                    <IconButton
                      onClick={() => {
                        if (effectiveSelectedSeat) {
                          const seatElement = document.querySelector(`[data-seat-id="${effectiveSelectedSeat}"]`);
                          if (seatElement) {
                            zoomToElement(seatElement as HTMLElement, 1, 500);
                          }
                        }
                      }}
                      disabled={!effectiveSelectedSeat}
                      sx={{
                        width: 48,
                        height: 48,
                        backgroundColor: "#fff",
                        borderRadius: "50%",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        color: effectiveSelectedSeat ? "#000" : "#ccc",
                        "&:hover": {
                          backgroundColor: effectiveSelectedSeat ? "rgba(0, 0, 0, 0.04)" : "#fff",
                        },
                        "&:disabled": {
                          backgroundColor: "#fff",
                        },
                      }}
                    >
                      <CenterFocusStrong />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "flex-start",
                  paddingTop: "200px",
                  paddingLeft: "30px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 6,
                    border: "6px solid black"
                  }}
                >
                  {/* Zone 1 */}
                  <Box
                    id="seating-zone1"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      paddingX: 3,
                      paddingY: 5,
                      borderRadius: 2,
                      border: "2px solid #e3f2fd",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        rowGap: 12,
                        columnGap: 5,
                        justifyItems: "center",
                      }}
                    >
                      {zoneOrganization.zone1.map((table) => (
                        <Table
                          key={table.id}
                          tableLetter={table.tableLetter}
                          onSeatClick={onSeatClick}
                          availableSeats={availableSeats}
                          selectedSeat={(() => {
                            // Determine the effective selected seat for visual highlighting
                            // Priority: 1. Dropdown selection for current date, 2. Clicked seat
                            if (
                              selectedDate &&
                              selectedSeatsFromDropdown[selectedDate]
                            ) {
                              return selectedSeatsFromDropdown[selectedDate];
                            }
                            if (selectedSeat) {
                              return selectedSeat;
                            }
                            return undefined;
                          })()}
                          width={400}
                          height={200}
                          bookedSeats={bookedSeats}
                          currentUser={currentUser}
                          timeSlot={timeSlot}
                        />
                      ))}
                    </Box>
                  </Box>
                  <Box id="seating-meeting" sx={{ width: 200, flexShrink: 0, border: '6px solid black', borderTop: 'none', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333', fontSize: '2rem', textAlign: 'center' }}>Meeting Rooms</Typography>
                  </Box>
                  {/* Zone 2 */}
                  <Box
                    id="seating-zone2"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      paddingX: 5,
                      paddingY: 5,
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        rowGap: 5,
                        columnGap: 12,
                        justifyItems: "center",
                      }}
                    >
                      {zoneOrganization.zone2.map((table) => (
                        <Table
                          key={table.id}
                          tableLetter={table.tableLetter}
                          onSeatClick={onSeatClick}
                          availableSeats={availableSeats}
                          selectedSeat={(() => {
                            // Determine the effective selected seat for visual highlighting
                            // Priority: 1. Dropdown selection for current date, 2. Clicked seat
                            if (
                              selectedDate &&
                              selectedSeatsFromDropdown[selectedDate]
                            ) {
                              return selectedSeatsFromDropdown[selectedDate];
                            }
                            if (selectedSeat) {
                              return selectedSeat;
                            }
                            return undefined;
                          })()}
                          width={320}
                          height={200}
                          bookedSeats={bookedSeats}
                          currentUser={currentUser}
                          timeSlot={timeSlot}
                          rotated={true}
                        />
                      ))}
                    </Box>
                    {/* Door image */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: -130,
                        right: 500,
                        transform: "translateX(-50%)",
                        zIndex: 10,
                      }}
                    >
                      <Image
                        src="/door.png"
                        alt="Door"
                        width={120}
                        height={60}
                        style={{
                          width: "auto",
                          height: "140px",
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </Box>
    </Box>
  );
}
