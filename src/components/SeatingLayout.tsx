import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Table from './Table';
import { SeatingConfig } from '../config/seatingConfig';

interface SeatingLayoutProps {
  onSeatClick?: (seatId: string) => void;
  availableSeats?: string[];
  selectedSeat?: string;
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

export default function SeatingLayout({ onSeatClick, availableSeats, selectedSeat, seatingConfig, selectedDate, onDateClick, bookedSeats = [], currentUser, timeSlot }: SeatingLayoutProps) {
  // Generate table rows dynamically based on configuration
  const generateTableRows = () => {
    const rows = [];
    const totalRows = Math.ceil(seatingConfig.numberOfTables / seatingConfig.tablesPerRow);
    
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const startTableIndex = rowIndex * seatingConfig.tablesPerRow;
      const endTableIndex = Math.min(startTableIndex + seatingConfig.tablesPerRow, seatingConfig.numberOfTables);
      
      const tablesInRow = [];
      const lettersInRow = [];
      
      for (let tableIndex = startTableIndex; tableIndex < endTableIndex; tableIndex++) {
        tablesInRow.push(`table-${rowIndex}-${tableIndex % seatingConfig.tablesPerRow}`);
        lettersInRow.push(seatingConfig.tableLetters[tableIndex]);
      }
      
      rows.push({
        id: `row${rowIndex + 1}`,
        tables: tablesInRow,
        letters: lettersInRow
      });
    }
    
    return rows;
  };


  // Generate date chips based on new logic
  const getDateChips = () => {
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
    
    return dates;
  };
  const dateChips = getDateChips();
  const tableRows = generateTableRows();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 0,
      alignItems: 'center',
      height: '100%',
      overflow: 'auto',
      width: '100%'
    }}>
      {/* Date header chips - full width and sticky at top */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          mb: 4, // more margin below header
          pb: 2,
          pt: 2,
          px: 2,
          background: '#fff',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
          {dateChips.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            
            // Check if date is in the past (same logic as ReservationForm)
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentHour = now.getHours();
            const currentDay = today.getDay();
            const isAfterFridayDeadline = currentDay === 5 && currentHour >= 15;
            const isPastDate = !isAfterFridayDeadline && date < today;
            
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
        minHeight: 400
      }}>
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={3}
          wheel={{
            step: 0.1
          }}
          pinch={{
            step: 0.1
          }}
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
                  paddingTop: '20px'
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {tableRows.map((row) => (
                    <Box key={row.id} sx={{ display: 'flex', gap: 3, mb: 6 }}>
                      {row.tables.map((tableId, index) => (
                        <Table
                          key={tableId}
                          tableLetter={row.letters[index]}
                          onSeatClick={onSeatClick}
                          availableSeats={availableSeats}
                          selectedSeat={selectedSeat}
                          width={200}
                          height={70}
                          bookedSeats={bookedSeats}
                          currentUser={currentUser}
                          timeSlot={timeSlot}
                        />
                      ))}
                    </Box>
                  ))}
                </Box>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </Box>
    </Box>
  );
}
