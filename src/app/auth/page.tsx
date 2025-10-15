"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container,
  TextField, 
  Button, 
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { vercelDataService } from '../../services/vercelDataService';

export default function AuthPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('seatBookingUserId');
    if (storedUserId) {
      // If already authenticated, redirect to home
      router.push('/');
    }
  }, [router]);

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
      console.log(`🔐 Attempting to authenticate user: "${trimmedUserId}"`);
      
      // Check if user exists via API
      const existingUser = await vercelDataService.getUserById(trimmedUserId);
      
      if (existingUser) {
        // User exists, proceed with authentication
        console.log(`👤 Existing user authenticated: ${existingUser.user_id} (${existingUser.email})`);
        
        // Store user ID in localStorage
        localStorage.setItem('seatBookingUserId', trimmedUserId);
        
        // Navigate back to main page
        router.push('/');
      } else {
        // User does not exist
        console.log(`❌ User "${trimmedUserId}" not found in system`);
        setError(`User "${trimmedUserId}" not found. Available users: 1234, U001, U002, U003, U004`);
        return;
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setError('Authentication failed. Please try again.');
    }
  };

  const handleUserIdChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUserId = event.target.value;
    setUserId(newUserId);
    if (error) setError(''); // Clear error when user starts typing
    
    // Check if user exists for display purposes
    if (newUserId.trim().length >= 3) {
      try {
        const existingUser = await vercelDataService.getUserById(newUserId.trim());
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
    <Container 
      maxWidth="sm" 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}
    >
      <Card 
        sx={{ 
          width: '100%', 
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            py: 4,
            textAlign: 'center',
            borderRadius: '12px 12px 0 0'
          }}
        >
          <PersonIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" component="h1" fontWeight={600}>
            Welcome
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mt: 1 }}>
            Seat Booking System
          </Typography>
        </Box>

        <CardContent sx={{ px: 4, py: 4 }}>
          {/* Welcome Message */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
            User Authentication Required
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Please enter your User ID to access the seat reservation system. Only registered users can make reservations.
          </Typography>

          {/* Existing User Welcome */}
          {isExistingUser && userEmail && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Welcome back!</strong> ({userEmail})
              </Typography>
            </Alert>
          )}

          {/* Auth Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
            <TextField
              autoFocus
              label="User ID"
              type="text"
              fullWidth
              value={userId}
              onChange={handleUserIdChange}
              error={!!error}
              helperText={error || 'Enter your registered User ID (minimum 3 characters)'}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  py: 1
                }
              }}
            />
          </Box>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Only users registered in the system can access the seat booking service. 
            Contact an administrator if you need access.
          </Typography>
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ px: 4, pb: 4, gap: 2, flexDirection: 'column' }}>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!userId.trim() || userId.trim().length < 3}
            fullWidth
            size="large"
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            Get Started
          </Button>
        </CardActions>
      </Card>
    </Container>
  );
}