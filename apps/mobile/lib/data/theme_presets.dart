/// Seasonal palette gallery — Dart port of the website's
/// `components/theme/themePresets.ts` (single source of truth is mirrored
/// there; keep both in sync when a preset is added).
class ThemePreset {
  final String key;
  final String name;
  final String primaryColor; // #RRGGBB
  final String accentColor; // #RRGGBB
  final String saleTagText;

  const ThemePreset({
    required this.key,
    required this.name,
    required this.primaryColor,
    required this.accentColor,
    required this.saleTagText,
  });
}

const List<ThemePreset> themePresets = [
  // Brand default
  ThemePreset(key: 'standard', name: 'Standard Green', primaryColor: '#0B6E4F', accentColor: '#00C853', saleTagText: '10-15 Min Delivery Guarantee'),
  // Festivals
  ThemePreset(key: 'diwali', name: 'Diwali Lights', primaryColor: '#7C2D12', accentColor: '#F59E0B', saleTagText: 'Diwali Dhamaka — Festive Deals Live'),
  ThemePreset(key: 'holi', name: 'Holi Colors', primaryColor: '#BE185D', accentColor: '#F472B6', saleTagText: 'Holi Hai! Colorful Savings Inside'),
  ThemePreset(key: 'raksha-bandhan', name: 'Raksha Bandhan', primaryColor: '#9D174D', accentColor: '#FB7185', saleTagText: 'Rakhi Special — Send Love in 15 Min'),
  ThemePreset(key: 'eid', name: 'Eid Mubarak', primaryColor: '#065F46', accentColor: '#34D399', saleTagText: 'Eid Mubarak — Feast Essentials Fast'),
  ThemePreset(key: 'christmas', name: 'Christmas Cheer', primaryColor: '#7F1D1D', accentColor: '#22C55E', saleTagText: 'Merry Christmas — Holiday Treats Delivered'),
  ThemePreset(key: 'pongal', name: 'Pongal Harvest', primaryColor: '#92400E', accentColor: '#FBBF24', saleTagText: 'Pongal Harvest Fresh — Festive Prices'),
  ThemePreset(key: 'navratri', name: 'Navratri Nine', primaryColor: '#6D28D9', accentColor: '#F97316', saleTagText: 'Navratri Special — 9 Days of Deals'),
  ThemePreset(key: 'independence', name: 'Tiranga Sale', primaryColor: '#1E3A8A', accentColor: '#F97316', saleTagText: 'Tiranga Sale — Independence Offers'),
  // Seasons
  ThemePreset(key: 'summer', name: 'Summer Chill', primaryColor: '#0E7490', accentColor: '#22D3EE', saleTagText: 'Summer Chill — Cold Drinks & Ice Creams'),
  ThemePreset(key: 'monsoon', name: 'Monsoon Mood', primaryColor: '#1E40AF', accentColor: '#60A5FA', saleTagText: 'Monsoon Mood — Hot Snacks & Pakoras'),
  ThemePreset(key: 'winter', name: 'Winter Warmth', primaryColor: '#3730A3', accentColor: '#818CF8', saleTagText: 'Winter Warmth — Cozy Comfort Foods'),
  ThemePreset(key: 'mango', name: 'Mango Season', primaryColor: '#B45309', accentColor: '#FBBF24', saleTagText: 'Mango Mania — Season\'s Best Pickings'),
  // Commerce moments
  ThemePreset(key: 'midnight', name: 'Midnight Express', primaryColor: '#1E1B4B', accentColor: '#6366F1', saleTagText: 'Midnight Express — Late Night Cravings Solved'),
  ThemePreset(key: 'big-save', name: 'Big Save Days', primaryColor: '#B91C1C', accentColor: '#FACC15', saleTagText: 'Big Save Days — Huge Discounts Live'),
  ThemePreset(key: 'new-year', name: 'New Year Blast', primaryColor: '#0F172A', accentColor: '#F59E0B', saleTagText: 'New Year Blast — Party Supplies Fast'),
];
