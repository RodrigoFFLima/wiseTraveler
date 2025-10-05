import { StyleSheet } from "react-native";

// Paleta de cores sugerida para um visual "Wise Traveler" (Moderno e Confiável)
// Azul Escuro/Navy: #2C3E50 (Confiabilidade)
// Verde Água/Menta: #1ABC9C (Ação/Botão)
// Cinza Claro: #ECF0F1 (Fundo/Card Borda)

export const styles = StyleSheet.create({
  container: {
    // MUDANÇA CRÍTICA: Alinha todo o conteúdo à ESQUERDA
    alignItems: "flex-start",
    paddingHorizontal: 25,
    backgroundColor: "#F8F8F8",
    paddingTop: 40,
    paddingBottom: 50,
  }, // Título Principal
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#2C3E50",
    // Garante que o título ocupe 100% para alinhamento uniforme
    width: "100%",
    marginBottom: 8,
  }, // Subtítulo
  subtitle: {
    marginVertical: 10,
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "left", // MUDANÇA: Alinha o texto do subtítulo à esquerda
    width: "100%", // Ocupa a largura total
    marginBottom: 25, // Aumenta o espaço para os inputs
  },

  // Input
  input: {
    width: "100%",
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "white",
    borderRadius: 8,
    borderColor: "#BDC3C7", // Borda mais suave
    borderWidth: 1,
    marginBottom: 15, // Mais espaço entre os inputs
    fontSize: 16,
    color: "#2C3E50",
  },

  // Botão (Cor da Ação)
  button: {
    backgroundColor: "#1ABC9C", // Verde Água para ação
    height: 50, // Aumenta um pouco a altura
    width: "100%",
    marginVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000", // Adiciona uma sombra suave para profundidade
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  button_text: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },

  // Título do Cronograma (Onde está o ícone do avião)
  main_title_card: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginTop: 25,
    marginBottom: 10,
    alignSelf: "flex-start",
    // NOVO: Adicione padding horizontal para que o texto não toque a borda,
    // mas remova a margem lateral que pode estar causando a quebra indesejada.
    paddingHorizontal: 5, // Pequeno ajuste de padding para respirar
  },

  // Card de Dia Individual
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    padding: 20, // Aumenta o padding interno
    borderColor: "#ECF0F1", // Borda muito suave
    width: "100%",
    borderRadius: 10,
    marginTop: 15,
    // Sombra para destacar o card
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Título do Dia (Dia 1 - Chegada...)
  card_title_day: {
    fontWeight: "bold",
    fontSize: 17,
    color: "#FF6B6B", // Mantive um toque vibrante aqui
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: "#ECF0F1", // Linha divisória muito discreta
    marginVertical: 10,
  },

  // Blocos de Manhã/Tarde/Noite
  time_block: {
    marginBottom: 18, // Aumenta o espaçamento entre Manhã, Tarde, Noite
  },
  time_block_last: {
    marginBottom: 5,
  },
  time_title: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1ABC9C", // Usa a cor de ação para destacar a hora
    marginBottom: 3,
  },
  card_text: {
    fontSize: 14,
    color: "#34495E", // Texto escuro e legível
    lineHeight: 20, // Melhora a legibilidade de frases longas
  },
});
