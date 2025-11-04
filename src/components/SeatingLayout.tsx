import { Box, IconButton, Tooltip, Typography, Button } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faMinus,
  faLocationCrosshairs,
} from "@fortawesome/free-solid-svg-icons";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useMemo, useRef, useEffect, useState } from "react";
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
  bookedSeats?: Array<{
    seatId: string;
    userId: string;
  }>;
  currentUser?: string;
  onToggleDrawer?: () => void;
  drawerOpen?: boolean;
  isWeekend?: boolean;
}

export default function SeatingLayout({
  onSeatClick,
  availableSeats,
  selectedSeat,
  selectedSeatsFromDropdown = {},
  seatingConfig,
  selectedDate,
  bookedSeats = [],
  currentUser,
  onToggleDrawer,
  drawerOpen = false,
  isWeekend = false,
}: SeatingLayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null);
  const [isMapCentered, setIsMapCentered] = useState(false);

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
  const handleZoneFocus = (
    zone: "zone1" | "zone2" | "fullmap",
    zoomToElement: (
      element: HTMLElement,
      scale: number,
      duration: number
    ) => void
  ) => {
    const seatElement = document.getElementById(`seating-${zone}`);
    if (seatElement) {
      // Different scales for different views
      let scale = 0.5;
      if (zone === "fullmap") {
        scale = 0.4; // Show entire map
      } else if (zone === "zone1" || zone === "zone2") {
        scale = 0.65; // Zoom into specific zone
      }
      zoomToElement(seatElement as HTMLElement, scale, 500);
    }
  };

  // Center the map on initial load to match Full Map view
  useEffect(() => {
    if (transformRef.current) {
      const timer = setTimeout(() => {
        const fullMapElement = document.getElementById("seating-fullmap");
        if (fullMapElement && transformRef.current?.zoomToElement) {
          transformRef.current.zoomToElement(fullMapElement, 0.4, 0);
          setIsMapCentered(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Compute the effective selected seat - prioritize user's booked seat for current date
  const effectiveSelectedSeat = useMemo(() => {
    if (selectedDate && currentUser) {
      // Find the seat booked by current user for the selected date
      const userBookingForDate = bookedSeats.find(
        (booking) => booking.userId === currentUser
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
  }, [
    selectedDate,
    currentUser,
    bookedSeats,
    selectedSeatsFromDropdown,
    selectedSeat,
  ]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        alignItems: "center",
        height: "100%",
        width: "100%",
        position: "relative",
      }}
    >
      {/* Zoomable tables section */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          overflow: "hidden",
          position: "relative",
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TransformWrapper
          ref={transformRef}
          initialScale={0.4}
          minScale={0.2}
          maxScale={3}
          centerOnInit={true}
          centerZoomedOut={false}
          alignmentAnimation={{ disabled: true }}
          wheel={{
            step: 0.1,
          }}
          pinch={{
            step: 0.1,
          }}
          limitToBounds={false}
          doubleClick={{
            disabled: true,
          }}
          panning={{
            velocityDisabled: true,
          }}
        >
          {({ zoomIn, zoomOut, zoomToElement }) => (
            <>
              {/* Second Row: Location controls and My Booked List button */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1,
                  background: "transparent",
                  borderRadius: 2,
                  gap: 2,
                  width: "100%",
                }}
              >
                {/* Zone Focus Controls */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Typography
                    fontWeight={600}
                    sx={{
                      display: { xs: "none", md: "inline-block" },
                      fontSize: "0.8rem",
                    }}
                  >
                    Location:{" "}
                  </Typography>

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
                    onClick={() => handleZoneFocus("fullmap", zoomToElement)}
                  />
                </Box>

                {/* My Booked List Button - Hidden when drawer is open */}
                {!drawerOpen && (
                  <Button
                    variant="contained"
                    startIcon={
                      <Image
                        src="/menu-open.png"
                        alt="Menu"
                        width={20}
                        height={20}
                      />
                    }
                    onClick={onToggleDrawer}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      px: 2,
                      py: 0.5,
                      backgroundColor: "primary.main",
                      "&:hover": {
                        backgroundColor: "primary.main",
                      },
                    }}
                  >
                    Booked Seats
                  </Button>
                )}
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
                      fontSize: "1rem",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
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
                      color: "secondary.main",
                      fontSize: "1rem",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <FontAwesomeIcon icon={faMinus} />
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
                <Tooltip
                  title={
                    effectiveSelectedSeat
                      ? "Zoom to Selected Seat"
                      : "No Seat Selected"
                  }
                  placement="left"
                >
                  <span>
                    <IconButton
                      onClick={() => {
                        if (effectiveSelectedSeat) {
                          const seatElement = document.querySelector(
                            `[data-seat-id="${effectiveSelectedSeat}"]`
                          );
                          if (seatElement) {
                            zoomToElement(seatElement as HTMLElement, 1, 500);
                          }
                        }
                      }}
                      disabled={!effectiveSelectedSeat}
                      sx={{
                        width: 48,
                        height: 48,
                        backgroundColor: "white.main",
                        borderRadius: "50%",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        color: effectiveSelectedSeat ? "#000" : "#ccc",
                        "&:hover": {
                          backgroundColor: effectiveSelectedSeat
                            ? "rgba(0, 0, 0, 0.04)"
                            : "white.main",
                        },
                        "&:disabled": {
                          backgroundColor: "white.main",
                        },
                        fontSize: "1rem",
                      }}
                    >
                      <FontAwesomeIcon icon={faLocationCrosshairs} />
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
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: isMapCentered ? 1 : 0,
                  transition: "opacity 0.2s ease-in",
                }}
              >
                <Box
                  id="seating-fullmap"
                  onDoubleClick={() => {
                    const fullMapElement =
                      document.getElementById("seating-fullmap");
                    if (fullMapElement) {
                      zoomToElement(fullMapElement as HTMLElement, 0.4, 500);
                    }
                  }}
                  sx={{
                    display: "flex",
                    gap: 6,
                    border: "6px solid black",
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
                          isWeekend={isWeekend}
                        />
                      ))}
                    </Box>
                  </Box>
                  <Box
                    id="seating-meeting"
                    sx={{
                      width: 200,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "flex-start",
                    }}
                  >
                    <Image
                      src="/meeting-room.png"
                      alt="Meeting Rooms"
                      width={200}
                      height={200}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        borderBottom: "12px solid black",
                      }}
                    />
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
                          rotated={true}
                          isWeekend={isWeekend}
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
