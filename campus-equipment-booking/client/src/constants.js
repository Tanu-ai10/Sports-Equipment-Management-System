export const SPORTS = ['Football', 'Basketball', 'Cricket', 'Badminton', 'Table Tennis', 'Volleyball', 'Athletics', 'Kabaddi', 'Gym', 'Chess'];
export const TIME_SLOTS = Array.from({ length: 12 }, (_, index) => {
  const formatHour = (hour) => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  const startHour = index + 7;
  return `${formatHour(startHour)}–${formatHour(startHour + 1)}`;
});
export const PURPOSES = ['Practice', 'Tournament', 'Event'];
export const SPORT_ICON = {
  Football: '⚽', Basketball: '🏀', Cricket: '🏏', Badminton: '🏸', 'Table Tennis': '🏓',
  Volleyball: '🏐', Athletics: '🏃', Kabaddi: '🤼', Gym: '🏋️', Chess: '♟️',
};
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
