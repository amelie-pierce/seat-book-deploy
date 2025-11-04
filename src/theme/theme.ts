"use client";
import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    gray: Palette['primary'];
    white: Palette['primary'];
  }
  interface PaletteOptions {
    gray?: PaletteOptions['primary'];
    white?: PaletteOptions['primary'];
  }
}

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5A67BA",
      dark: "#4A56A0",
      light: "#EAECF5",
    },
    secondary: {
      main: "#4A4A4A",
      dark: "#3A3A3A",
      light: "#6B6B6B",
    },
    success: {
      main: "#61BF76",
      dark: "#4FA863",
      light: "#7DD18F",
    },
    error: {
      main: "#E53E3E",
      dark: "#C93232",
      light: "#F06565",
    },
    warning: {
      main: "#F5A623",
      dark: "#D98E1C",
      light: "#F8BD54",
    },
    info: {
      main: "#4DA3FF",
      dark: "#3D8FE6",
      light: "#75B8FF",
    },
    gray: {
      main: "#ECECEE",
      dark: "#9FA4AF",
      light: "#F7F8FA",
    },
    white: { main: "#FFFFFF" },
  },
  typography: {
    fontFamily:
      "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  },
});

export default theme;
