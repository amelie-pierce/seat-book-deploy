import { Box, Chip, IconButton, Tooltip, Button } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useMemo, useRef } from 'react';
import Table from './Table';
import { SeatingConfig } from '../config/seatingConfig';

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
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
  currentUser?: string;
  timeSlot?: 'AM' | 'PM' | 'FULL_DAY';
}

export default function SeatingLayout({ onSeatClick, availableSeats, selectedSeat, selectedSeatsFromDropdown = {}, seatingConfig, selectedDate, onDateClick, bookedSeats = [], currentUser, timeSlot }: SeatingLayoutProps) {
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
      zone: 'zone1' as const
    }));
    
    // Create zone 2 tables (horizontally aligned)
    const zone2Data = zone2Tables.map((tableLetter, index) => ({
      id: `zone2-table-${index}`,
      tableLetter,
      zone: 'zone2' as const
    }));
    
    return {
      zone1: zone1Data,
      zone2: zone2Data
    };
  }, [seatingConfig.zones]);

  // Handle zone focus (zoom/center only, no highlighting)
  const handleZoneFocus = (zone: 'zone1' | 'zone2' | 'all') => {
    if (!transformRef.current) return;

    if (zone === 'all') {
      // Reset to show all zones
      transformRef.current.resetTransform();
      return;
    }
    
    // Focus on specific zone
    setTimeout(() => {
      const zoneElement = document.getElementById(`seating-${zone}`);
      const contentElement = transformRef.current.instance.contentComponent;
      const wrapperElement = transformRef.current.instance.wrapperComponent;
      
      if (zoneElement && contentElement && wrapperElement) {
        // Get the zone's position relative to the content container
        const contentRect = contentElement.getBoundingClientRect();
        const zoneRect = zoneElement.getBoundingClientRect();
        const wrapperRect = wrapperElement.getBoundingClientRect();
        
        // Calculate zone center relative to content
        const zoneRelativeX = zoneRect.left - contentRect.left + (zoneRect.width / 2);
        const zoneRelativeY = zoneRect.top - contentRect.top + (zoneRect.height / 2);
        
        // Calculate wrapper center
        const wrapperCenterX = wrapperRect.width / 2;
        const wrapperCenterY = wrapperRect.height / 2;
        
        // Calculate the offset to center the zone in the wrapper
        const offsetX = wrapperCenterX - zoneRelativeX;
        const offsetY = wrapperCenterY - zoneRelativeY;
        
        // Apply the transform with appropriate zoom
        const zoomLevel = 1.2;
        transformRef.current.setTransform(offsetX, offsetY, zoomLevel);
      }
    }, 100);
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
      isAfterFridayDeadline
    };
  }, []); // Only recalculate when component mounts

  // Memoize the effective selected seat calculation
  const effectiveSelectedSeat = useMemo(() => {
    // Determine the effective selected seat for visual highlighting
    // Priority: 1. Clicked seat, 2. Dropdown selection for current date
    if (selectedSeat) {
      return selectedSeat;
    }
    if (selectedDate && selectedSeatsFromDropdown[selectedDate]) {
      return selectedSeatsFromDropdown[selectedDate];
    }
    return undefined;
  }, [selectedSeat, selectedDate, selectedSeatsFromDropdown]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      alignItems: 'center',
      height: '100%',
      width: '100%'
    }}>
      {/* Date header chips - full width and sticky at top */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          p: 2,
          background: '#fff',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid #e0e0e0',
          overflowX: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          {dateChips.dates.map((date) => {
            const dateStr = date.toISOString().split('T')[0];

            // Check if date is in the past (same logic as ReservationForm)
            const isPastDate = !dateChips.isAfterFridayDeadline && date < dateChips.today;

            return (
              <Chip
                key={dateStr}
                label={date.toLocaleDateString()}
                color={isPastDate ? 'default' : (selectedDate === dateStr ? 'secondary' : 'default')}
                variant={selectedDate === dateStr ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: selectedDate === dateStr ? 'bold' : 'normal',
                  flex: 1,
                  cursor: isPastDate ? 'not-allowed' : 'pointer',
                  border: selectedDate === dateStr ? '2px solid #1976d2' : undefined,
                  boxShadow: selectedDate === dateStr ? 2 : 0,
                  opacity: isPastDate ? 0.5 : 1,
                  minHeight: 36,
                  fontSize: '0.875rem',
                }}
                onClick={onDateClick && !isPastDate ? () => onDateClick(dateStr) : undefined}
              />
            );
          })}
        </Box>
      </Box>
      {/* Zoomable tables section */}
      <Box sx={{
        flex: 1,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 400,
      }}>
        {/* Zone Focus Controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            left: 10,
            zIndex: 1000,
            display: 'flex',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: 1,
            borderRadius: 1,
            backdropFilter: 'blur(4px)'
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleZoneFocus('zone1')}
          >
            Zone A-E
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleZoneFocus('zone2')}
          >
            Zone F-J
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleZoneFocus('all')}
          >
            Show All
          </Button>
        </Box>
        <TransformWrapper
          ref={transformRef}
          initialScale={0.6}
          minScale={0.5}
          maxScale={3}
          wheel={{
            step: 0.1
          }}
          pinch={{
            step: 0.1
          }}
          limitToBounds={false}
          centerOnInit={true}
          doubleClick={{
            disabled: false,
            mode: 'reset'
          }}
          panning={{
            velocityDisabled: true
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Control Buttons */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 2,
                  padding: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <Tooltip title="Zoom In" placement="left">
                  <IconButton
                    onClick={() => zoomIn(0.2)}
                    size="small"
                    sx={{
                      backgroundColor: '#fff',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <ZoomIn fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out" placement="left">
                  <IconButton
                    onClick={() => zoomOut(0.2)}
                    size="small"
                    sx={{
                      backgroundColor: '#fff',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <ZoomOut fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset View (100%)" placement="left">
                  <IconButton
                    onClick={() => resetTransform()}
                    size="small"
                    sx={{
                      backgroundColor: '#fff',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <CenterFocusStrong fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%'
                }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  paddingTop: '200px'
                }}
              >
                {/* Two Zones Side by Side */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 6, 
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  width: '100%',
                }}>
                  {/* Zone 1 */}
                  <Box
                    id="seating-zone1"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: 3,
                      borderRadius: 2,
                      backgroundColor: 'rgba(227, 242, 253, 0.3)',
                      border: '2px solid #e3f2fd',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      flex: 1,
                      maxWidth: '700px'
                    }}
                  >
                    <Box sx={{ 
                      textAlign: 'center', 
                      mb: 1,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#1976d2'
                    }}>
                      {seatingConfig.zones.zone1.name}
                    </Box>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      rowGap: 8,
                      columnGap: 3,
                      justifyItems: 'center',
                      maxWidth: '650px'
                    }}>
                      {zoneOrganization.zone1.map((table) => (
                        <Table
                          key={table.id}
                          tableLetter={table.tableLetter}
                          onSeatClick={onSeatClick}
                          availableSeats={availableSeats}
                          selectedSeat={(() => {
                            // Determine the effective selected seat for visual highlighting
                            // Priority: 1. Dropdown selection for current date, 2. Clicked seat
                            if (selectedDate && selectedSeatsFromDropdown[selectedDate]) {
                              return selectedSeatsFromDropdown[selectedDate];
                            }
                            if (selectedSeat) {
                              return selectedSeat;
                            }
                            return undefined;
                          })()}
                          width={200}
                          height={70}
                          bookedSeats={bookedSeats}
                          currentUser={currentUser}
                          timeSlot={timeSlot}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Zone 2 */}
                  <Box
                    id="seating-zone2"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: 3,
                      borderRadius: 2,
                      backgroundColor: 'rgba(243, 229, 245, 0.3)',
                      border: '2px solid #f3e5f5',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      flex: 1,
                      maxWidth: '700px'
                    }}
                  >
                    <Box sx={{ 
                      textAlign: 'center', 
                      mb: 1,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#9c27b0'
                    }}>
                      {seatingConfig.zones.zone2.name}
                    </Box>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      rowGap: 8,
                      columnGap: 3,
                      justifyItems: 'center',
                      maxWidth: '650px'
                    }}>
                      {zoneOrganization.zone2.map((table) => (
                        <Table
                          key={table.id}
                          tableLetter={table.tableLetter}
                          onSeatClick={onSeatClick}
                          availableSeats={availableSeats}
                          selectedSeat={effectiveSelectedSeat}
                          width={180}
                          height={70}
                          bookedSeats={bookedSeats}
                          currentUser={currentUser}
                          timeSlot={timeSlot}
                        />
                      ))}
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
