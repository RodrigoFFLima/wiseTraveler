import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F5F8' },
  headerBackground: { paddingBottom: 50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { alignItems: 'center', marginTop: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 10 },
  subtitle: { color: '#B0BEC5', fontSize: 14 },

  contentContainer: { flex: 1, paddingHorizontal: 20, marginTop: -30 },

  // --- Formulário ---
  formCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA',
    borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E9ECEF'
  },
  inputIcon: { marginLeft: 15 },
  input: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    backgroundColor: '#2C5364', width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 4
  },

  // --- Loading & Resultados ---
  loadingContainer: { marginTop: 50, alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#2C5364', fontWeight: '600', marginTop: 20 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C5364' },
  shareButton: { backgroundColor: '#10B981', flexDirection: 'row', padding: 8, borderRadius: 20, paddingHorizontal: 15, alignItems: 'center' },
  shareText: { color: '#FFF', fontWeight: '600', marginLeft: 5, fontSize: 12 },

  // --- Cards do Roteiro ---
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, padding: 20, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  dayBadge: { backgroundColor: '#2C5364', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dayText: { color: '#FFF', fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  weatherTip: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },

  // --- NOVA TIMELINE (Icones em vez de pontos) ---
  timelineContainer: { position: 'relative', paddingLeft: 0 },
  // AJUSTE 1: A linha agora fica centralizada com os novos ícones maiores
  timelineLine: { position: 'absolute', left: 16, top: 10, bottom: 20, width: 2, backgroundColor: '#E0E0E0', zIndex: -1 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 25 },

  // NOVO ESTILO: Container circular para o ícone
  timelineIconContainer: {
    width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
    marginRight: 15, zIndex: 1, borderWidth: 2, borderColor: '#FFF', elevation: 1
  },
  timelineContent: { flex: 1 },
  periodTitle: { fontSize: 12, color: '#999', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },

  // AJUSTE 2: Adicionado paddingRight para o texto não grudar na borda
  activityText: { fontSize: 15, color: '#444', lineHeight: 22, paddingRight: 10 },
});