import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, BackHandler, FlatList, Share, StatusBar,
  Text,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '../components/input';
import { generateTravelSchedule, getGeminiErrorMessage, regenerateTravelDay, TravelSchedule } from '../services/ia/generator';
import { posthog } from '../services/posthog';
import { SavedTrip, tripStorage } from '../services/storage';
import { styles } from '../styles';

export default function Index() {
  const [city, setCity] = useState('');
  const [days, setDays] = useState('');
  const [interests, setInterests] = useState(''); 
  const [travelDate, setTravelDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<TravelSchedule | null>(null);
  const [history, setHistory] = useState<SavedTrip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  const [cooldownTime, setCooldownTime] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    let interval: any; 
    
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => prev - 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [cooldownTime]);

  useEffect(() => {
    const backAction = () => {
      if (schedule) {
        setSchedule(null);
        // Opcional: Se quiser limpar tudo ao voltar, descomente abaixo:
        // setCity(''); setDays(''); setInterests(''); setTravelDate('');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [schedule]);

  async function loadHistory() {
    const data = await tripStorage.getAll();
    setHistory(data);
  }

  async function handleDeleteTrip(id: string) {
    Alert.alert(
      "Excluir Roteiro",
      "Tem certeza que deseja apagar este roteiro?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            // 1. Remove da lista visualmente (filtro)
            const newHistory = history.filter(item => item.id !== id);
            setHistory(newHistory);
            
            await tripStorage.remove(id);
            posthog?.capture('saved_itinerary_deleted');
          }
        }
      ]
    );
  }

  async function handleShare() {
    if (!schedule) return;
    const message = schedule.map(d => `📅 *${d.day}* (${d.weatherTip})\n${d.morning}`).join('\n');
    posthog?.capture('itinerary_share_initiated', {
      itinerary_days: schedule.length,
    });
    Share.share({ message: `✈️ Roteiro WiseTraveler para ${city}:\n${message}` });
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function handleExportPdf() {
    if (!schedule || exportingPdf) return;
    setExportingPdf(true);
    try {
      const scheduleHtml = schedule.map((item, index) => `
        <section class="day">
          <div class="day-title"><span class="badge">${index + 1}</span><h2>${escapeHtml(item.day)}</h2></div>
          <p class="weather">Temperatura e roupas: ${escapeHtml(item.weatherTip)}</p>
          <div class="activity"><strong>Manhã</strong><p>${escapeHtml(item.morning)}</p></div>
          <div class="activity"><strong>Tarde</strong><p>${escapeHtml(item.afternoon)}</p></div>
          <div class="activity"><strong>Noite</strong><p>${escapeHtml(item.night)}</p></div>
        </section>
      `).join('');

      const html = `
        <!doctype html><html><head><meta charset="utf-8" />
        <style>
          @page { margin: 28px; }
          body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #24343b; }
          header { background: #2c5364; color: white; padding: 22px; border-radius: 12px; }
          h1 { margin: 0 0 8px; font-size: 26px; } header p { margin: 0; font-size: 15px; }
          .day { page-break-inside: avoid; border: 1px solid #dce5e8; border-radius: 12px; padding: 16px; margin-top: 18px; }
          .day-title { display: flex; align-items: center; gap: 10px; } h2 { margin: 0; font-size: 19px; }
          .badge { background: #2c5364; color: white; border-radius: 50%; width: 28px; height: 28px; text-align: center; line-height: 28px; font-weight: bold; }
          .weather { color: #65747a; font-style: italic; margin: 10px 0 16px; }
          .activity { border-left: 3px solid #4db6ac; padding-left: 12px; margin: 12px 0; }
          .activity strong { color: #2c5364; } .activity p { margin: 4px 0 0; line-height: 1.4; }
          footer { color: #849197; font-size: 11px; text-align: center; margin-top: 24px; }
        </style></head><body>
          <header><h1>WiseTraveler · ${escapeHtml(city)}</h1><p>${escapeHtml(travelDate)} · ${escapeHtml(days)} dias</p></header>
          ${scheduleHtml}<footer>Roteiro criado pelo WiseTraveler</footer>
        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const safeCity = city
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'viagem';
      const safeDate = travelDate.replace(/[^0-9-]/g, '-');
      const fileName = `wisetraveler-${safeCity}-${safeDate}.pdf`;
      const renamedUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: renamedUri });
      posthog?.capture('itinerary_exported_pdf', {
        itinerary_days: schedule.length,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(renamedUri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar roteiro em PDF' });
      } else {
        Alert.alert('PDF gerado', 'O compartilhamento não está disponível neste dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleGenerate() {
    if (!city || !days || !travelDate || travelDate.length < 10) {
      return Alert.alert("Ops!", "Preencha destino, data (DD/MM/AAAA) e dias.");
    }

    const [day, month, year] = travelDate.split('/').map(Number);
    
    const inputDate = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      inputDate.getFullYear() !== year ||
      inputDate.getMonth() !== month - 1 ||
      inputDate.getDate() !== day
    ) {
      return Alert.alert("Data Inválida", "Essa data não existe no calendário.");
    }

    if (inputDate < today) {
      return Alert.alert("Viajante do Tempo? 🕰️", "A data da viagem não pode ser no passado!");
    }

    const daysNumber = Number(days);
    if (isNaN(daysNumber) || daysNumber < 1) {
      return Alert.alert("Atenção", "A viagem precisa ter pelo menos 1 dia!");
    }
    if (daysNumber > 30) { 
      return Alert.alert("Eita!", "O limite atual é de 30 dias de roteiro.");
    }

    if (cooldownTime > 0) {
      return Alert.alert("Aguarde", `Espere mais ${cooldownTime} segundos para gerar outro roteiro.`);
    }

    setLoading(true);
    setSchedule(null);

    try {
      const result = await generateTravelSchedule({
        destination: city,
        days: daysNumber,
        interests,
        travelDate
      });

      if (typeof result !== 'string') {
        setSchedule(result);
        const newTrip: SavedTrip = {
          id: Date.now().toString(),
          city,
          days: daysNumber,
          date: travelDate,
          schedule: result
        };
        await tripStorage.save(newTrip);
        posthog?.capture('itinerary_generated', {
          itinerary_days: daysNumber,
          has_interests: Boolean(interests.trim()),
        });
        setActiveTripId(newTrip.id);
        loadHistory();
        setCooldownTime(30); 
      }
    } catch (error) {
      console.error("❌ ERRO DETALHADO DA IA:", error);
      const { title, message } = getGeminiErrorMessage(error);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  }

  function openHistoryItem(trip: SavedTrip) {
    setActiveTripId(trip.id);
    setCity(trip.city);
    setDays(trip.days.toString());
    setTravelDate(trip.date);
    setSchedule(trip.schedule);
  }

  async function handleRegenerateDay(index: number) {
    if (!schedule || regeneratingDay !== null) return;
    setRegeneratingDay(index);
    try {
      const replacement = await regenerateTravelDay({
        destination: city,
        day: schedule[index],
        interests,
        travelDate,
      });
      const updatedSchedule = schedule.map((day, dayIndex) => dayIndex === index ? replacement : day);
      setSchedule(updatedSchedule);
      if (activeTripId) await tripStorage.update(activeTripId, updatedSchedule);
      posthog?.capture('itinerary_day_regenerated', {
        day_number: index + 1,
        itinerary_days: updatedSchedule.length,
      });
      await loadHistory();
    } catch (error) {
      const { title, message } = getGeminiErrorMessage(error);
      Alert.alert(title, message);
    } finally {
      setRegeneratingDay(null);
    }
  }

  function handleDateChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }

    setTravelDate(formatted);
  }

  function resetSearch() {
    setSchedule(null);
    setCity('');
    setDays('');
    setInterests('');
    setTravelDate('');
  }

  const renderScheduleItem = ({ item, index }: { item: any, index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dayBadge}><Text style={styles.dayText}>{index + 1}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.day.replace(/Dia \d+ - /, '')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="thermometer-outline" size={17} color="#666" style={{ marginTop: 2, marginRight: 5 }} />
            <Text style={[styles.weatherTip, { flex: 1 }]}>{item.weatherTip}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleRegenerateDay(index)}
          disabled={regeneratingDay !== null}
          accessibilityRole="button"
          accessibilityLabel={`Regenerar ${item.day}`}
          style={{ padding: 8, marginLeft: 6 }}
        >
          {regeneratingDay === index ? (
            <ActivityIndicator size="small" color="#2C5364" />
          ) : (
            <Ionicons name="refresh-outline" size={23} color="#2C5364" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.timelineContainer}>
        <View style={styles.timelineLine} />
        <View style={styles.timelineItem}>
          <View style={[styles.timelineIconContainer, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="weather-sunny" size={20} color="#FFB74D" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.activityText}>{item.morning}</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <View style={[styles.timelineIconContainer, { backgroundColor: '#E0F2F1' }]}>
            <MaterialCommunityIcons name="weather-sunset" size={20} color="#4DB6AC" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.activityText}>{item.afternoon}</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <View style={[styles.timelineIconContainer, { backgroundColor: '#E8EAF6' }]}>
            <MaterialCommunityIcons name="weather-night" size={20} color="#7986CB" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.activityText}>{item.night}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        style={[styles.headerBackground, schedule ? { paddingBottom: 20, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 } : {}]}
      >
        <SafeAreaView style={styles.headerContent}>
          {schedule ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={resetSearch} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Nova Busca</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <MaterialCommunityIcons name="airplane-takeoff" size={32} color="#4DB6AC" />
              <Text style={styles.title}>WiseTraveler</Text>
              <Text style={styles.subtitle}>Planeje. Viaje. Explore.</Text>
            </>
          )}
        </SafeAreaView>
      </LinearGradient>

      <View style={[styles.contentContainer, schedule ? { marginTop: 10 } : {}]}>

        {!schedule && !loading && (
          <>
            <View style={styles.formCard}>
              <Input
                iconName="location-outline"
                placeholder="Destino (ex: Gramado)"
                value={city}
                onChangeText={setCity}
              />
              <Input
                iconName="calendar-number-outline"
                placeholder="Quando? (DD/MM/AAAA)" // Dica visual
                value={travelDate}
                onChangeText={handleDateChange} // Usa a nova função com máscara
                keyboardType="numeric"          // Força teclado numérico
                maxLength={10}                  // Limita a 10 caracteres (10/10/2026)
              />
              <Input
                iconName="heart-outline"
                placeholder="Interesses (ex: Natureza, Vinhos)"
                value={interests}
                onChangeText={setInterests}
              />
              <View style={styles.row}>
                <Input
                  iconName="time-outline"
                  placeholder="Dias"
                  value={days}
                  onChangeText={setDays}
                  keyboardType="numeric"
                  maxLength={2}
                  style={{ flex: 1, marginBottom: 0, marginRight: 10 }}
                />
                
                <TouchableOpacity 
                  style={[styles.button, { marginBottom: 0, backgroundColor: cooldownTime > 0 ? '#999' : '#2C5364' }]} 
                  onPress={handleGenerate}
                  disabled={cooldownTime > 0}
                >
                  {cooldownTime > 0 ? (
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>{cooldownTime}s</Text>
                  ) : (
                    <Ionicons name="sparkles" size={24} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 30, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <Ionicons name="document-text-outline" size={22} color="#2C5364" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2C5364' }}>Últimos Roteiros</Text>
              </View>
              <FlatList
                data={history}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} 
                      onPress={() => openHistoryItem(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{item.city}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="calendar-outline" size={16} color="#666" style={{ marginRight: 5 }} />
                          <Text style={{ fontSize: 14, color: '#666' }}>{item.date} • {item.days} dias</Text>
                        </View>
                      </View>
                      
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                         <TouchableOpacity onPress={() => handleDeleteTrip(item.id)} style={{padding: 10, marginRight: 5}}>
                            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                         </TouchableOpacity>
                         <Ionicons name="chevron-forward" size={20} color="#999" />
                      </View>

                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>Seus roteiros salvos aparecerão aqui.</Text>}
              />
            </View>
          </>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2C5364" />
            <Text style={styles.loadingText}>Criando roteiro para {city}...</Text>
          </View>
        )}

        {schedule && !loading && (
          <View style={{ flex: 1 }}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.resultTitle}>{city}</Text>
                <Text style={{ color: '#666', fontSize: 14 }}>
                  {travelDate} {travelDate ? '-' : ''} {days} dias
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleExportPdf} style={styles.shareButton} disabled={exportingPdf}>
                  {exportingPdf ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="document-text-outline" size={20} color="#FFF" />}
                  <Text style={styles.shareText}>{exportingPdf ? 'Gerando...' : 'PDF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                  <Ionicons name="share-social-outline" size={20} color="#FFF" />
                  <Text style={styles.shareText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={schedule}
              keyExtractor={(item) => item.day}
              renderItem={renderScheduleItem}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}
