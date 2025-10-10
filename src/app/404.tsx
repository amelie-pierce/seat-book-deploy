'use client';
import { Container, Box, Typography, Button, Alert } from '@mui/material';
import { ErrorOutline as ErrorIcon, Home as HomeIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function Custom404() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h1" component="h1" gutterBottom sx={{ fontSize: '4rem', fontWeight: 'bold', color: 'error.main' }}>
          404
        </Typography>

        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={handleGoHome}
          size="large"
          sx={{ mt: 2 }}
        >
          Try Again
        </Button>
      </Box>
    </Container>
  );
}
