import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

const specialties = [
  { title: 'Ceviche de pescado', note: 'La esencia de nuestra costa.', image: require('../../../../assets/ceviche-pescado.jpg') },
  { title: 'Ceviche de camarón', note: 'Sabor para disfrutar sin apuro.', image: require('../../../../assets/ceviche-camaron.jpg') },
  { title: 'Ceviche mixto', note: 'Lo mejor de ambos en tu mesa.', image: require('../../../../assets/ceviche-mixto.jpg') },
];

function AccessLink({ href, children, secondary = false }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.button, secondary && styles.secondary])}>
        <Text style={[styles.buttonText, secondary && { color: '#24543a' }]}>{children}</Text>
      </Pressable>
    </Link>
  );
}

export default function WelcomeScreen() {
  const wide = useWindowDimensions().width >= 760;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.flag} accessibilityLabel="Colores de Manabí: verde, blanco y rojo">
          <View style={{ flex: 1, backgroundColor: '#078638' }} />
          <View style={{ flex: 1, backgroundColor: '#ffffff' }} />
          <View style={{ width: 44, backgroundColor: '#c72f32' }} />
        </View>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MontePica<Text style={{ color: '#c72f32' }}>.</Text></Text>
            <Text style={styles.eyebrow}>CEVICHERÍA · MANABÍ</Text>
          </View>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" style={{ padding: 12 }}>
              <Text style={styles.login}>Ingresar ↗</Text>
            </Pressable>
          </Link>
        </View>

        <View style={[styles.hero, wide && { flexDirection: 'row' }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>NUESTRA TIERRA. NUESTRO SABOR.</Text>
            <Text accessibilityRole="header" style={[styles.headline, wide && { fontSize: 60 }]}>El gusto de{`\n`}sentirse en{`\n`}Manabí.</Text>
            <View style={styles.accent} />
            <Text style={styles.intro}>Ceviches, buena compañía y ese toque manabita que nos reúne alrededor de la mesa.</Text>
            <View style={styles.actions}>
              <AccessLink href="/(auth)/register">Crear mi cuenta →</AccessLink>
              <AccessLink href="/(auth)/login" secondary>Iniciar sesión</AccessLink>
            </View>
            <Text style={styles.small}>En el local o a domicilio. Tú eliges cómo disfrutar.</Text>
          </View>
          <View style={[styles.heroPhoto, wide && { flex: 1, minHeight: 470 }]}>
            <Image source={require('../../../../assets/ceviche-mixto.jpg')} accessibilityLabel="Ceviche mixto de MontePica" style={styles.photo} resizeMode="cover" />
            <View style={styles.photoCaption}>
              <Text style={styles.photoLabel}>HECHO PARA COMPARTIR</Text>
              <Text style={styles.photoTitle}>Un encuentro con nuestra costa.</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ color: '#c72f32', letterSpacing: 8, marginBottom: 14 }}>★ ★ ★</Text>
          <Text style={styles.eyebrow}>UN POCO DE NOSOTROS</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Raíces manabitas, mesa abierta.</Text>
          <Text style={styles.body}>Somos MontePica, una cevichería con identidad manabita. Nos inspira la cocina de nuestra costa y el gusto de compartir una buena comida. Aquí, cada encuentro empieza con una bienvenida.</Text>
          <View style={[styles.values, wide && { flexDirection: 'row' }]}>
            {[
              ['01', 'Sabor de la costa', 'Ceviches de pescado, camarón y mixto, acompañados de bebidas.'],
              ['02', 'En nuestra mesa', 'Inicia sesión y escanea el QR de tu mesa para comenzar tu visita.'],
              ['03', 'También en casa', 'Crea tu cuenta y consulta la cobertura de domicilio al realizar tu pedido.'],
            ].map(([number, title, text]) => (
              <View key={number} style={styles.value}>
                <Text style={styles.number}>{number} /</Text>
                <Text style={styles.valueTitle}>{title}</Text>
                <Text style={styles.body}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>PARA ABRIR EL APETITO</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Nuestros sabores.</Text>
          <Text style={[styles.body, { marginBottom: 22 }]}>Una mirada a nuestras especialidades. Inicia sesión para consultar el menú y los precios actuales.</Text>
          <View style={[styles.cards, wide && { flexDirection: 'row' }]}>
            {specialties.map((item) => (
              <View key={item.title} style={styles.card}>
                <Image source={item.image} accessibilityLabel={item.title} style={styles.cardImage} resizeMode="cover" />
                <View style={{ padding: 20 }}>
                  <Text style={styles.valueTitle}>{item.title}</Text>
                  <Text style={styles.body}>{item.note}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.closing}>
          <Text accessibilityRole="header" style={styles.closingTitle}>Tu próxima mesa empieza aquí.</Text>
          <Text style={{ color: '#e5eadc', lineHeight: 24, textAlign: 'center' }}>Únete a MontePica y encuentra tu forma de disfrutar.</Text>
          <View style={{ marginTop: 22 }}><AccessLink href="/(auth)/register" secondary>Crear una cuenta →</AccessLink></View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.brand}>MontePica.</Text>
          <Text style={styles.small}>Con identidad manabita. Con gusto de recibirte.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f5ec' },
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 24 },
  flag: { height: 6, flexDirection: 'row' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 26 },
  brand: { fontSize: 27, fontWeight: '900', color: '#24543a', letterSpacing: -1 },
  eyebrow: { color: '#087f39', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 5 },
  login: { color: '#24543a', fontWeight: '700', fontSize: 14 },
  hero: { backgroundColor: '#eeeddf', borderRadius: 24, overflow: 'hidden' },
  heroCopy: { flex: 1, padding: 28, justifyContent: 'center' },
  kicker: { fontSize: 10, fontWeight: '800', color: '#087f39', letterSpacing: 1.5, marginBottom: 22 },
  headline: { fontSize: 46, fontWeight: '800', color: '#24543a', letterSpacing: -2 },
  accent: { width: 46, height: 4, backgroundColor: '#c72f32', marginVertical: 22 },
  intro: { color: '#455343', fontSize: 16, lineHeight: 26, maxWidth: 400 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26 },
  button: { backgroundColor: '#24543a', paddingHorizontal: 21, paddingVertical: 16, borderRadius: 12, minHeight: 48, alignItems: 'center' },
  secondary: { backgroundColor: '#f8f5ec', borderWidth: 1, borderColor: '#dedfce' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  small: { fontSize: 12, color: '#687363', lineHeight: 20, marginTop: 15 },
  heroPhoto: { minHeight: 300, position: 'relative' },
  photo: { width: '100%', height: '100%', position: 'absolute' },
  photoCaption: { margin: 20, marginTop: 'auto', padding: 20, backgroundColor: '#183e2a', borderRadius: 14 },
  photoLabel: { color: '#ffffff', fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  photoTitle: { color: '#fff', fontSize: 21, fontWeight: '600', marginTop: 8 },
  section: { paddingTop: 48 },
  sectionTitle: { color: '#24543a', fontWeight: '800', fontSize: 29, marginTop: 10, marginBottom: 14, letterSpacing: -0.7 },
  body: { color: '#455343', fontSize: 14, lineHeight: 23 },
  values: { gap: 16, marginTop: 24 },
  value: { flex: 1, padding: 22, backgroundColor: '#eeeddf', borderRadius: 16 },
  number: { color: '#c72f32', fontSize: 13, fontWeight: '800', marginBottom: 16 },
  valueTitle: { fontSize: 18, fontWeight: '700', color: '#24543a', marginBottom: 8 },
  cards: { gap: 18 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderColor: '#dedfce', borderWidth: 1 },
  cardImage: { height: 220, width: '100%' },
  closing: { marginTop: 44, backgroundColor: '#24543a', padding: 30, borderRadius: 22, alignItems: 'center' },
  closingTitle: { color: '#fff', fontSize: 27, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  footer: { alignItems: 'center', paddingTop: 32 },
});
