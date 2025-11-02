import { Box, Typography, Chip, IconButton, Divider } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";

interface BookedSeatItemProps {
  seatId: string; // e.g., "D1", "D2", "D3"
  zone: string; // e.g., "A" or "B"
  bookedDates: string[]; // Array of date strings in format "YYYY-MM-DD"
  allDates: Date[]; // All available dates to display
  onDelete?: () => void; // Optional callback when delete button is clicked
  onDateToggle?: (dateStr: string, currentlyBooked: boolean) => void; // Callback when date is clicked
  modifiedDates?: { [dateStr: string]: boolean }; // Track modified dates (true = add, false = remove)
  disabledDates?: string[]; // Dates that are booked by other users
}

export default function BookedSeatItem({
  seatId,
  zone,
  bookedDates,
  allDates,
  onDelete,
  onDateToggle,
  modifiedDates = {},
  disabledDates = [],
}: BookedSeatItemProps) {
  // Helper function to format date
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get month and year from the dates
  const getMonthYear = () => {
    if (allDates.length > 0) {
      const firstDate = allDates[0];
      const monthName = firstDate.toLocaleDateString('en-US', { month: 'long' });
      const year = firstDate.getFullYear();
      return `(${monthName}, ${year}):`;
    }
    return '';
  };

  return (
    <Box
      sx={{
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        p: 2,
        mb: 2,
        backgroundColor: '#fff',
      }}
    >
      {/* Header: Seat ID and Zone */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: '#FF6B35',
            }}
          >
            Desk {seatId}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#6B7280',
            }}
          >
            - Zone {zone}
          </Typography>
        </Box>
        <IconButton
          onClick={onDelete}
          size="small"
          sx={{
            color: '#9CA3AF',
            '&:hover': {
              color: '#EF4444',
              backgroundColor: '#FEE2E2',
            },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Divider */}
      <Divider sx={{ mb: 1.5 }} />

      {/* Date Selection Label */}
      <Typography
        sx={{
          fontSize: '0.875rem',
          color: '#1F2937',
          mb: 1,
        }}
      >
        Select date <span style={{ fontWeight: 600 }}>{getMonthYear()}</span>
      </Typography>

      {/* Date Chips Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 1,
        }}
      >
        {allDates
          .filter((date) => {
            const dayOfWeek = date.getDay();
            // Only show weekdays (Monday = 1 to Friday = 5)
            return dayOfWeek >= 1 && dayOfWeek <= 5;
          })
          .map((date) => {
            const dateStr = formatLocalDate(date);
            const isOriginallyBooked = bookedDates.includes(dateStr);
            const isModified = modifiedDates[dateStr] !== undefined;
            
            // Check if date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPastDate = date < today;
            
            // Disable if booked by others OR if date is in the past
            const isDisabled = disabledDates.includes(dateStr) || isPastDate;
            
            // Calculate effective state after modifications
            let isBooked = isOriginallyBooked;
            if (isModified) {
              isBooked = modifiedDates[dateStr]; // true = will be booked, false = will be unbooked
            }
            
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = String(date.getDate()).padStart(2, '0');

            return (
              <Chip
                key={dateStr}
                label={`${dayName}, ${dayNumber}`}
                onClick={isDisabled ? undefined : () => onDateToggle?.(dateStr, isOriginallyBooked)}
                disabled={isDisabled}
                sx={{
                  borderRadius: '6px',
                  backgroundColor: isDisabled ? '#F3F4F6' : (isBooked ? '#FFE8DF' : '#E5E7EB'),
                  color: isDisabled ? '#9CA3AF' : (isBooked ? '#FF6B35' : '#6B7280'),
                  border: isModified && !isDisabled ? '2px solid #FF6B35' : 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: '32px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.6 : 1,
                  '& .MuiChip-label': {
                    px: 1,
                    py: 0,
                  },
                  '&:hover': {
                    backgroundColor: isDisabled 
                      ? '#F3F4F6' 
                      : (isBooked ? '#FFD4C4' : '#D1D5DB'),
                  },
                }}
              />
            );
          })}
      </Box>
    </Box>
  );
}
