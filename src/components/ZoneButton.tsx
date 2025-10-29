import { Button } from "@mui/material";

interface ZoneButtonProps {
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export default function ZoneButton({ label, onClick }: ZoneButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      onClick={onClick}
      sx={{
        backgroundColor: "#ECECEE",
        color: "#333",
        fontWeight: 600,
        fontSize: "1rem",
        textTransform: "none",
        borderRadius: 1,
        px: 2,
        py: 1,
        boxShadow: 'none',
        "&:hover": {
          backgroundColor: "rgba(255, 82, 8, 0.08)",
          color: "primary.main",
          boxShadow: 'none',
        },
      }}
    >
      {label}
    </Button>
  );
}
