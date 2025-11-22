import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import React, {FC} from 'react'


interface Props {
    title: string
}

const MyButton : FC<Props> = ({ title, onPress }) => {
    return (
        <TouchableOpacity onPress={onPress} style={styles.button}>
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    )
}

export default MyButton

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#4CAF50', // green button
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10,
    },
    text: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
})
