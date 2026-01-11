import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
    iconName: keyof typeof Ionicons.glyphMap;
}

// O style agora é retirado das props e aplicado na View (container)
export function Input({ iconName, style, ...rest }: InputProps) {
    return (
        // MUDANÇA AQUI: O 'style' vem para o container externo!
        // Convertemos o style para ViewStyle para o TypeScript não reclamar
        <View style={[styles.inputGroup, style as ViewStyle]}>
            <Ionicons
                name={iconName}
                size={20}
                color="#666"
                style={styles.inputIcon}
            />
            <TextInput
                style={styles.input} // O input interno fica com estilo fixo
                placeholderTextColor="#888"
                {...rest} // As outras props (value, onChange) continuam aqui
            />
        </View>
    );
}

const styles = StyleSheet.create({
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
    }
});