export interface LetterNote {
  id: string;
  title: string;
  notes: string; // space-separated note letters, e.g. "C D E F G G F E D C"
  created_at: string;
  updated_at: string;
}
