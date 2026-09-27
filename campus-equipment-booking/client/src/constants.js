export const SPORTS = ['Football', 'Basketball', 'Cricket', 'Badminton', 'Table Tennis', 'Volleyball', 'Athletics', 'Kabaddi', 'Gym', 'Chess'];
export const TIME_SLOTS = ['7:00–8:00 AM', '8:00–9:00 AM', '4:00–5:00 PM', '5:00–6:00 PM', '6:00–7:00 PM'];
export const PURPOSES = ['Practice', 'Tournament', 'Event'];
export const SPORT_ICON = {
  Football: '⚽', Basketball: '🏀', Cricket: '🏏', Badminton: '🏸', 'Table Tennis': '🏓',
  Volleyball: '🏐', Athletics: '🏃', Kabaddi: '🤼', Gym: '🏋️', Chess: '♟️',
};
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
