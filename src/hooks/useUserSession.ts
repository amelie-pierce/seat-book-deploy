import { useState, useEffect } from 'react';

interface UserSession {
  userId: string;
  timestamp: number;
}

export function useUserSession() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowAuthModal, setShouldShowAuthModal] = useState(false);

  // Load user from localStorage on component mount
  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem('seatBookingUserId');
      
      if (storedUserId && storedUserId.trim() !== '') {
        setCurrentUser(storedUserId);
        setShouldShowAuthModal(false);
      } else {
        setCurrentUser(null);
        setShouldShowAuthModal(true);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      setCurrentUser(null);
      setShouldShowAuthModal(true);
    }
    
    setIsLoading(false);
  }, []);

  const setUser = (userId: string) => {
    setCurrentUser(userId);
    setShouldShowAuthModal(false);
    localStorage.setItem('seatBookingUserId', userId);
  };

  const clearUserSession = () => {
    setCurrentUser(null);
    setShouldShowAuthModal(true);
    localStorage.removeItem('seatBookingUserId');
  };

  const getUserSession = (): UserSession | null => {
    const userId = localStorage.getItem('seatBookingUserId');
    
    if (userId) {
      return {
        userId,
        timestamp: Date.now() // Return current timestamp since we no longer store it
      };
    }
    return null;
  };

  return {
    currentUser,
    setUser,
    clearUserSession,
    getUserSession,
    isAuthenticated: !!currentUser,
    isLoading,
    shouldShowAuthModal,
    setShouldShowAuthModal
  };
}
