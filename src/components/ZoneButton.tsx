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
        fontSize: "0.875rem",
        textTransform: "none",
        borderRadius: 1,
        px: 1,
        py: 0.5,
        boxShadow: "none",
        "&:hover": {
          backgroundColor: "rgba(91, 104, 223, 0.08)",
          color: "primary.main",
          boxShadow: "none",
        },
      }}
    >
      {label}
    </Button>
  );
}
