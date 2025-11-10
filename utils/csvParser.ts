
import { NetflixTitle, ContentType } from '../types';

export const parseCSV = (csvText: string): NetflixTitle[] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        }
        // Handle \r\n
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Remove header if it exists and looks like a header
  let dataRows = rows;
  if (rows.length > 0 && rows[0][0] === 'show_id') {
    dataRows = rows.slice(1);
  }

  return dataRows.map(row => {
    // Ensure row has enough columns, fill with empty strings if not
    // CSV columns: show_id,type,title,director,cast,country,date_added,release_year,rating,duration,listed_in,description
    
    // Basic validation
    if (row.length < 2) return null;

    return {
      show_id: row[0] || '',
      type: (row[1] === 'TV Show' ? ContentType.TVShow : ContentType.Movie),
      title: row[2] || '',
      director: row[3] || '',
      cast: row[4] || '',
      country: row[5] || '',
      date_added: row[6] || '',
      release_year: parseInt(row[7]) || 0,
      rating: row[8] || '',
      duration: row[9] || '',
      listed_in: row[10] || '',
      description: row[11] || ''
    };
  }).filter((item): item is NetflixTitle => item !== null);
};
