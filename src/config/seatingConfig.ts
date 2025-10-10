// Restaurant seating configuration
// Modify these values to easily adjust the seating layout

export interface SeatingConfig {
  numberOfTables: number;    // Total number of tables
  seatsPerTable: number;     // Number of seats per table
  tablesPerRow: number;      // Number of tables per row in the layout
  tableLetters: string[];    // Letters for table identification
}

export const SEATING_CONFIG: SeatingConfig = {
  numberOfTables: 10,         // Total number of tables (A, B, C, D, E, F)
  seatsPerTable: 8,          // Number of seats per table (1, 2, 3, 4, 5, 6)
  tablesPerRow: 3,           // Number of tables per row in the layout
  tableLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] // Letters for table identification
};

// Helper function to generate all possible seat IDs
export const generateAllSeats = (config: SeatingConfig): string[] => {
  const allSeats: string[] = [];
  for (let tableIndex = 0; tableIndex < config.numberOfTables; tableIndex++) {
    const tableLetter = config.tableLetters[tableIndex];
    for (let seatNumber = 1; seatNumber <= config.seatsPerTable; seatNumber++) {
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
