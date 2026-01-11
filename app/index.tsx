import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante para o Rate Limit
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, BackHandler, FlatList, Share, StatusBar,
  Text,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '../components/input';
import { generateTravelSchedule, TravelSchedule } from '../services/ia/generator';
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
  
  // Estado para controlar o Rate Limit (Cooldown)
  const [cooldownTime, setCooldownTime] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  // --- CORREÇÃO DO ERRO AQUI ---
  // Trocamos NodeJS.Timeout por 'any' para evitar conflito de tipos
  useEffect(() => {
    let interval: any; 
    
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => prev - 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [cooldownTime]);
  // -----------------------------

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

  // NOVA FUNÇÃO: Excluir item do histórico (Corrigida)
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
            
            // 2. Salva a nova lista no celular (usando AsyncStorage direto)
            // Removemos a linha tripStorage.saveAll que estava dando erro
            await AsyncStorage.setItem('@wisetraveler:trips', JSON.stringify(newHistory));
          }
        }
      ]
    );
  }

  async function handleShare() {
    if (!schedule) return;
    const message = schedule.map(d => `📅 *${d.day}* (${d.weatherTip})\n${d.morning}`).join('\n');
    Share.share({ message: `✈️ Roteiro WiseTraveler para ${city}:\n${message}` });
  }

  async function handleGenerate() {
    // 1. VALIDAÇÃO DE CAMPOS VAZIOS
    if (!city || !days || !travelDate || travelDate.length < 10) {
      return Alert.alert("Ops!", "Preencha destino, data (DD/MM/AAAA) e dias.");
    }

    // 2. VALIDAÇÃO DE DATA (NOVA 📅)
    // Quebra o texto "25/12/2023" em partes numéricas
    const [day, month, year] = travelDate.split('/').map(Number);
    
    // Cria a data inserida (Mês no JS começa em 0, por isso month - 1)
    const inputDate = new Date(year, month - 1, day);
    
    // Cria a data de hoje e zera as horas (para comparar apenas dia/mês/ano)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validação A: A data existe mesmo? (Evita 30/02, mês 13, etc)
    if (
      inputDate.getFullYear() !== year ||
      inputDate.getMonth() !== month - 1 ||
      inputDate.getDate() !== day
    ) {
      return Alert.alert("Data Inválida", "Essa data não existe no calendário.");
    }

    // Validação B: É passado?
    if (inputDate < today) {
      return Alert.alert("Viajante do Tempo? 🕰️", "A data da viagem não pode ser no passado!");
    }

    // 3. VALIDAÇÃO DE DIAS
    const daysNumber = Number(days);
    if (isNaN(daysNumber) || daysNumber < 1) {
      return Alert.alert("Atenção", "A viagem precisa ter pelo menos 1 dia!");
    }
    if (daysNumber > 30) { 
      return Alert.alert("Eita!", "O limite atual é de 30 dias de roteiro.");
    }

    // 4. RATE LIMIT
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
        travelDate // Enviamos a string formatada mesmo
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
        loadHistory();
        setCooldownTime(30); 
      }
    } catch (error) {
      Alert.alert("Erro", "Falha na conexão.");
    } finally {
      setLoading(false);
    }
  }

  function openHistoryItem(trip: SavedTrip) {
    setCity(trip.city);
    setDays(trip.days.toString());
    setTravelDate(trip.date);
    setSchedule(trip.schedule);
  }

  // Função que aplica a máscara de data (DD/MM/AAAA)
  function handleDateChange(text: string) {
    // 1. Remove tudo que não é número
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;

    // 2. Adiciona a primeira barra após o dia
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    // 3. Adiciona a segunda barra após o mês
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
          <Text style={styles.weatherTip}>🌡️ {item.weatherTip}</Text>
        </View>
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
                
                {/* Botão com tratamento visual se estiver em Cooldown */}
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
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2C5364', marginBottom: 15 }}>📜 Últimos Roteiros</Text>
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
                        <Text style={{ fontSize: 14, color: '#666' }}>📅 {item.date} • {item.days} dias</Text>
                      </View>
                      
                      {/* Área de Ação: Abrir e Excluir */}
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                         {/* Botão de Excluir Pequeno */}
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
              <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
                <Text style={styles.shareText}>Compartilhar</Text>
              </TouchableOpacity>
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