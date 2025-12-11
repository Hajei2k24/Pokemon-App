import { Alert, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'
import MyButton from '../components/MyButton'
import MyTextInput from '../components/MyTextInput'
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';

const LoginScreen = ({navigation}) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const loginWithEmailAndPass = async () => {
        // Validation
        if (!email.trim() || !password.trim()) {
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

        setLoading(true);
        const auth = getAuth();
        
        try {
            const res = await signInWithEmailAndPassword(auth, email, password);
            console.log(res);
            Alert.alert("Success! 🎮", "Welcome back, Trainer!");
            navigation.navigate("Home");
        } catch (err) {
            console.log(err);
            let errorMessage = "An error occurred";
            
            if (err.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address";
            } else if (err.code === 'auth/user-disabled') {
                errorMessage = "This account has been disabled";
            } else if (err.code === 'auth/user-not-found') {
                errorMessage = "No account found with this email";
            } else if (err.code === 'auth/wrong-password') {
                errorMessage = "Incorrect password";
            } else if (err.code === 'auth/invalid-credential') {
                errorMessage = "Invalid email or password";
            }
            
            Alert.alert("Login Failed ❌", errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            {/* Header with title */}
            <View style={styles.header}>
                <Text style={styles.title}>Welcome Trainer!</Text>
                <Text style={styles.subtitle}>Sign in to continue your journey</Text>
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
                        placeholder="Username"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            value={password}
                            onChangeText={text => setPassword(text)}
                            placeholder="Password"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}>
                            <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                        <View style={styles.passwordBorder}/>
                    </View>

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don't Have An Account Yet?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                            <Text style={styles.signupLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                    <MyButton 
                        title={loading ? "Logging In..." : "Login"} 
                        onPress={loginWithEmailAndPass}
                        disabled={loading}
                    />

                    {loading && <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />}
                </View>
            </View>

            {/* Decorative elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
        </View>
    )
}

export default LoginScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FF6B6B',
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
        textShadowColor: '#3B4CCA',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 1,
    },
    subtitle: {
        fontSize: 16,
        color: 'white',
        marginTop: 5,
    },
    fieldtitle: {
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
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
        gap: 5,
    },
    signupText: {
        fontSize: 14,
        color: '#666',
    },
    signupLink: {
        fontSize: 14,
        color: '#3B4CCA',
        fontWeight: 'bold',
    },
    loader: {
        marginTop: 15,
    },
    passwordContainer: {
        height: 50,
        width: "100%",
        justifyContent: "center",
        paddingHorizontal: 10,
        marginBottom: 20,
        position: 'relative',
    },
    passwordInput: {
        color: "black",
        paddingRight: 40,
    },
    passwordBorder: {
        width: "100%",
        backgroundColor: "gray",
        height: 1,
        alignSelf: "center",
    },
    eyeIcon: {
        position: 'absolute',
        right: 10,
        top: 15,
        padding: 5,
    },
    eyeIconText: {
        fontSize: 20,
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
        backgroundColor: 'rgba(59, 76, 202, 0.15)',
    },
})