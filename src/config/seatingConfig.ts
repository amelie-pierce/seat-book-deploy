// Restaurant seating configuration
// Modify these values to easily adjust the seating layout

export interface SeatingConfig {
  numberOfTables: number;    // Total number of tables
  seatsPerTable: number;     // Number of seats per table
  tablesPerRow: number;      // Number of tables per row in the layout
  tableLetters: string[];    // Letters for table identification
  zones: {
    zone1: {
      name: string;
      tables: string[];
      color: string;
    };
    zone2: {
      name: string;
      tables: string[];
      color: string;
    };
  };
}

export const SEATING_CONFIG: SeatingConfig = {
  numberOfTables: 21,         // Total number of tables (9 in Zone A + 12 in Zone B)
  seatsPerTable: 8,          // Default number of seats per table (4 on top, 4 on bottom)
  tablesPerRow: 3,           // Number of tables per row in the layout (for Zone A)
  tableLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'], // Letters for table identification
  zones: {
    zone1: {
      name: 'Zone A (Tables A-I)',
      tables: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      color: '#e3f2fd' // Light blue
    },
    zone2: {
      name: 'Zone B (Tables J-U)',
      tables: ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'],
      color: '#f3e5f5' // Light purple
    }
  }
};

// Helper function to generate all possible seat IDs
export const generateAllSeats = (config: SeatingConfig): string[] => {
  const allSeats: string[] = [];
  for (let tableIndex = 0; tableIndex < config.numberOfTables; tableIndex++) {
    const tableLetter = config.tableLetters[tableIndex];
    
    // Determine seats per table based on zone and position
    let seatsForTable = 8; // Default
    
    // Zone A (A-I): Tables B, E, H (2nd column in 3x3 grid) have 6 seats
    if (['B', 'E', 'H'].includes(tableLetter)) {
      seatsForTable = 6;
    }
    // Zone B (J-U): First row (J-O) have 6 seats, second row (P-U) have 4 seats
    else if (['J', 'K', 'L', 'M', 'N', 'O'].includes(tableLetter)) {
      seatsForTable = 6;
    }
    else if (['P', 'Q', 'R', 'S', 'T', 'U'].includes(tableLetter)) {
      seatsForTable = 4;
    }
    
    for (let seatNumber = 1; seatNumber <= seatsForTable; seatNumber++) {
      allSeats.push(`${tableLetter}${seatNumber}`);
    }
  }
  return allSeats;
};

// Helper function to validate configuration
export const validateSeatingConfig = (config: SeatingConfig): boolean => {
  if (config.numberOfTables <= 0 || config.seatsPerTable <= 0 || config.tablesPerRow <= 0) {
    console.error('Seating config: All numeric values must be positive');
    return false;
  }
  
  if (config.tableLetters.length < config.numberOfTables) {
    console.error('Seating config: Not enough table letters for the number of tables');
    return false;
  }
  
  return true;
};
