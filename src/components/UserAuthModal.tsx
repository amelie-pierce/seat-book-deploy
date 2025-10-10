import { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField, 
  Button, 
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { csvDataService } from '../services/csvDataService';

interface UserAuthModalProps {
  open: boolean;
  onClose: () => void;
  onUserConfirmed: (userId: string) => void;
  selectedSeat?: string;
}

export default function UserAuthModal({ 
  open, 
  onClose, 
  onUserConfirmed, 
  selectedSeat 
}: UserAuthModalProps) {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      setError('User ID is required');
      return;
    }

    if (trimmedUserId.length < 3) {
      setError('User ID must be at least 3 characters long');
      return;
    }

    try {
      // Check if user exists in CSV data
      const existingUser = await csvDataService.getUserById(trimmedUserId);
      
      if (existingUser) {
        // User exists, proceed with authentication
        console.log(`👤 Existing user authenticated: ${existingUser.user_id} (${existingUser.email})`);
        
        // Store user ID in localStorage
        localStorage.setItem('seatBookingUserId', trimmedUserId);
        
        onUserConfirmed(trimmedUserId);
        handleClose();
      } else {
        // User does not exist in CSV file
        setError('User not exists');
        return;
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setError('Authentication failed. Please try again.');
    }
  };

  const handleClose = () => {
    setUserId('');
    setError('');
    setIsExistingUser(false);
    setUserEmail('');
    onClose();
  };

  const handleUserIdChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUserId = event.target.value;
    setUserId(newUserId);
    if (error) setError(''); // Clear error when user starts typing
    
    // Check if user exists for display purposes
    if (newUserId.trim().length >= 3) {
      try {
        const existingUser = await csvDataService.getUserById(newUserId.trim());
        if (existingUser) {
          setIsExistingUser(true);
          setUserEmail(existingUser.email);
        } else {
          setIsExistingUser(false);
          setUserEmail('');
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    } else {
      setIsExistingUser(false);
      setUserEmail('');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={selectedSeat ? handleClose : undefined} // Only allow close if there's a selected seat
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!selectedSeat} // Disable ESC key if no selected seat
      PaperProps={{
        sx: { borderRadius: 2, p: 1 }
      }}
    >
      <DialogTitle sx={{ pb: 1, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6" component="span">
            User Identification Required
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 2 }}>
        {selectedSeat ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            You&apos;re about to reserve seat: <strong>{selectedSeat}</strong>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Welcome! Please authenticate to start booking seats.
          </Alert>
        )}
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Please enter your User ID to access the seat reservation system. Only registered users can make reservations.
          {isExistingUser && userEmail && (
            <Box component="span" sx={{ display: 'block', mt: 1, fontWeight: 'medium', color: 'primary.main' }}>
              Welcome back! ({userEmail})
            </Box>
          )}
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            autoFocus
            label="User ID"
            type="text"
            fullWidth
            value={userId}
            onChange={handleUserIdChange}
            error={!!error}
            helperText={error || 'Enter your registered User ID (minimum 3 characters)'}
            sx={{ mb: 2 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          Only users registered in the system can access the seat booking service. Contact an administrator if you need access.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {selectedSeat && (
          <Button 
            onClick={handleClose} 
            color="inherit"
            variant="outlined"
          >
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!userId.trim() || userId.trim().length < 3}
        >
          {selectedSeat ? 'Continue to Booking' : 'Get Started'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
