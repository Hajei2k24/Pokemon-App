import { Alert, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import MyButton from '../components/MyButton'
import MyTextInput from '../components/MyTextInput'
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';

const SignUpScreen = ({navigation}) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const signUpTestFn = async () => {
        // Validation
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (!email.includes('@')) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match!");
            return;
        }

        setLoading(true);
        const auth = getAuth(); 

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            Alert.alert(
                "Success! 🎉", 
                "Your Trainer account has been created! Please login to start your journey.",
                [
                    {
                        text: "OK",
                        onPress: () => navigation.navigate("Login")
                    }
                ]
            );
        } catch (err) {
            console.log(err);
            let errorMessage = "An error occurred";
            
            // Handle specific error codes
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = "This email is already registered. Please login instead.";
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address format";
            } else if (err.code === 'auth/weak-password') {
                errorMessage = "Password is too weak. Use a stronger password.";
            } else if (err.code === 'auth/operation-not-allowed') {
                errorMessage = "Email/password accounts are not enabled";
            }
            
            Alert.alert("Signup Failed ❌", errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            {/* Header with title */}
            <View style={styles.header}>
                <Text style={styles.title}>Join the Adventure!</Text>
                <Text style={styles.subtitle}>Create your Trainer account</Text>
            </View>

            {/* Main Card Container */}
            <View style={styles.cardContainer}>
                <View style={styles.pokeballAccent} />
                
                <View style={styles.inputsContainer}>
                    <View style={styles.iconContainer}>
                        <View style={styles.pokeball}>
                            <View style={styles.pokeballTop} />
                            <View style={styles.pokeballMiddle}>
                                <View style={styles.pokeballCenter} />
                            </View>
                            <View style={styles.pokeballBottom} />
                        </View>
                    </View>

                    <MyTextInput 
                        value={email} 
                        onChangeText={text => setEmail(text)} 
                        placeholder="Email Address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    
                    <MyTextInput 
                        value={password} 
                        onChangeText={text => setPassword(text)} 
                        placeholder="Password (min 6 characters)" 
                        secureTextEntry
                    />
                    
                    <MyTextInput 
                        value={confirmPassword}  
                        onChangeText={text => setConfirmPassword(text)} 
                        placeholder="Confirm Password" 
                        secureTextEntry
                    />

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already Have An Account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                            <Text style={styles.loginLink}>Login Here</Text>
                        </TouchableOpacity>
                    </View>

                    <MyButton 
                        onPress={signUpTestFn} 
                        title={loading ? "Creating Account..." : "Sign Up"}
                        disabled={loading}
                    />

                    {loading && <ActivityIndicator size="large" color="#3B4CCA" style={styles.loader} />}
                </View>
            </View>

            {/* Decorative elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
        </View>
    )
}

export default SignUpScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3B4CCA',
        position: 'relative',
    },
    header: {
        marginTop: 60,
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFDE00',
        textShadowColor: '#FF6B6B',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 1,
    },
    subtitle: {
        fontSize: 16,
        color: 'white',
        marginTop: 5,
    },
    cardContainer: {
        flex: 1,
        paddingHorizontal: 20,
        position: 'relative',
    },
    pokeballAccent: {
        position: 'absolute',
        top: -30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
        borderWidth: 4,
        borderColor: '#2C2C2C',
    },
    inputsContainer: {
        backgroundColor: 'white',
        borderRadius: 30,
        paddingVertical: 40,
        paddingHorizontal: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    pokeball: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: '#2C2C2C',
    },
    pokeballTop: {
        height: '45%',
        backgroundColor: '#FF6B6B',
    },
    pokeballMiddle: {
        height: '10%',
        backgroundColor: '#2C2C2C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pokeballCenter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
        borderWidth: 3,
        borderColor: '#2C2C2C',
    },
    pokeballBottom: {
        height: '45%',
        backgroundColor: 'white',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
        gap: 5,
    },
    loginText: {
        fontSize: 14,
        color: '#666',
    },
    loginLink: {
        fontSize: 14,
        color: '#FF6B6B',
        fontWeight: 'bold',
    },
    loader: {
        marginTop: 15,
    },
    decorativeCircle1: {
        position: 'absolute',
        top: 100,
        left: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 222, 0, 0.2)',
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: 50,
        right: -70,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
    },
})