"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Container, TextField, Button, Typography, Box } from "@mui/material";
import { vercelDataService } from "../../services/vercelDataService";

export default function AuthPage() {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("seatBookingUserId");
    if (storedUserId) {
      // If already authenticated, redirect to home
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      setError("User ID is required");
      return;
    }

    if (trimmedUserId.length < 3) {
      setError("User ID must be at least 3 characters long");
      return;
    }

    try {
      console.log(`🔐 Attempting to authenticate user: "${trimmedUserId}"`);

      // Check if user exists via API
      const existingUser = await vercelDataService.getUserById(trimmedUserId);

      if (existingUser) {
        // User exists, proceed with authentication
        console.log(
          `👤 Existing user authenticated: ${existingUser.user_id} (${existingUser.email})`
        );

        // Store user ID in localStorage
        localStorage.setItem("seatBookingUserId", trimmedUserId);

        // Navigate back to main page
        router.push("/");
      } else {
        // User does not exist
        console.log(`❌ User "${trimmedUserId}" not found in system`);
        setError(
          `User "${trimmedUserId}" not found. Available users: 1234, U001, U002, U003, U004`
        );
        return;
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      setError("Authentication failed. Please try again.");
    }
  };

  const handleUserIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUserId = event.target.value;
    setUserId(newUserId);
    if (error) setError(""); // Clear error when user starts typing
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        backgroundColor: "#f5f5f5",
      }}
    >
      <Box>
        {/* Flexi Seat Header with Icon */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            mb: 4,
          }}
        >
          <Image src="/logo.png" alt="Flexi Seat Logo" width={32} height={32} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "secondary.main",
            }}
          >
            Flexi Seat
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 2,
            px: 6,
            py: 4,
            textAlign: "center",
            backgroundColor: "white.main",
          }}
        >
          {/* Sign in Now! */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#333",
              mb: 4,
            }}
          >
            Sign in Now !
          </Typography>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              autoFocus
              placeholder="Enter your PIN Code"
              type="text"
              fullWidth
              size="small"
              value={userId}
              onChange={handleUserIdChange}
              error={!!error}
              helperText={error}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#fafafa",
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={!userId.trim() || userId.trim().length < 3}
              fullWidth
              sx={{
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
