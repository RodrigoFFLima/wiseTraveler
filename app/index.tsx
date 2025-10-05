// Index.tsx (Completamente revisado para Cards)

import { MotiView } from "moti";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Importa a função (que agora retorna JSON ou string de erro)
import { generateTravelSchedule } from "../services/ia/generator";
import { styles } from "../styles"; // Importação dos seus estilos

// Definição do tipo para o estado da resposta (ajustado para o JSON)
interface DaySchedule {
  day: string; // Ex: "Dia 1 - Coração Histórico"
  morning: string;
  afternoon: string;
  night: string;
}

export default function Index() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");

  // O estado 'answer' agora armazena um array de cronogramas OU uma string de erro
  const [schedule, setSchedule] = useState<DaySchedule[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  const handlePress = async () => {
    const numDays = Number(days);

    if (destination.length < 3 || isNaN(numDays) || numDays <= 0) {
      Alert.alert(
        "Atenção",
        "Por favor, insira um destino válido e um número de dias positivo."
      );
      return;
    }

    setLoading(true);
    setSchedule(null); // Limpa o schedule anterior
    setErrorMessage(null); // Limpa o erro anterior

    try {
      const result = await generateTravelSchedule({
        destination: destination,
        days: numDays,
      });

      if (typeof result === "string") {
        // Se a função retornou uma string, é uma mensagem de erro
        setErrorMessage(result);
      } else {
        // Caso contrário, é o array de cronograma JSON
        setSchedule(result);
      }
    } catch (error) {
      console.error("Erro na chamada da API:", error);
      setErrorMessage("Erro desconhecido ao processar a solicitação.");
    } finally {
      setLoading(false);
    }
  };

  // Componente de Cartão para um Único Dia (CORRIGIDO)
  const DayCard = ({ daySchedule }: { daySchedule: DaySchedule }) => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
      style={[styles.card, { marginTop: 15 }]}
    >
      {/* Título do Dia */}
      <Text style={styles.card_title_day}>{daySchedule.day}</Text>
      <View style={styles.divider} />

      {/* Manhã */}
      <View style={styles.time_block}>
        <Text style={styles.time_title}>Manhã:</Text>
        <Text style={styles.card_text}>{daySchedule.morning}</Text>
      </View>

      {/* Tarde */}
      <View style={styles.time_block}>
        <Text style={styles.time_title}>Tarde:</Text>
        <Text style={styles.card_text}>{daySchedule.afternoon}</Text>
      </View>

      {/* Noite (Bloco Corrigido) */}
      <View style={styles.time_block_last}>
        {/* O " " (espaço) foi removido daqui! */}
        <Text style={styles.time_title}>Noite:</Text>
        <Text style={styles.card_text}>{daySchedule.night}</Text>
      </View>
    </MotiView>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>Planeje sua Viagem Perfeita</Text>
      <Text style={styles.subtitle}>
        Roteiros inteligentes e personalizados em segundos.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Para onde vamos? (Ex: Paris, França)"
        value={destination}
        onChangeText={setDestination}
        editable={!isLoading}
      />
      <TextInput
        style={styles.input}
        placeholder="Duração da viagem (Ex: 5 dias)"
        value={days}
        onChangeText={setDays}
        keyboardType="numeric"
        editable={!isLoading}
      />
      {/* Botão (Mantido) */}
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        disabled={isLoading}
      >
        <Text style={styles.button_text}>
          {isLoading ? "Carregando..." : "Gerar Cronograma"}
        </Text>
      </TouchableOpacity>
      {schedule && schedule.length > 0 && (
        <>
          <Text style={styles.main_title_card}>
            ✨ Seu Itinerário de {schedule.length} Dias está Pronto!
          </Text>
          {schedule.map((dayData, index) => (
            <DayCard key={index} daySchedule={dayData} />
          ))}
        </>
      )}
      {/* Exibição de Erros */}
      {errorMessage && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={[
            styles.card,
            { backgroundColor: "#FFDDDD", borderColor: "#FF6B6B" },
          ]}
        >
          <Text style={{ color: "#C0392B", fontWeight: "bold" }}>Erro:</Text>
          <Text style={styles.card_text}>{errorMessage}</Text>
        </MotiView>
      )}
      {/* Espaço de segurança */}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}
