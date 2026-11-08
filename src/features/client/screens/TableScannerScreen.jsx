import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconButton from '@/features/client/components/IconButton';
import useTableQrScanner from '@/features/client/hooks/useTableQrScanner';
import useVisitParticipation from '@/features/client/hooks/useVisitParticipation';
import VisitParticipationPanel from '@/features/client/components/VisitParticipationPanel';
import { logoutUser } from '@/shared/session/sessionStore';

function ScannerHeader({ showTorch, torchEnabled, onToggleTorch }) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
      <IconButton
        label="Volver al inicio"
        onPress={() => router.back()}
        className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
        textClassName="text-xl text-white"
      >
        ×
      </IconButton>
      <Text className="text-base font-semibold text-white">Escanear mesa</Text>
      {showTorch ? (
        <IconButton
          label={torchEnabled ? 'Apagar linterna' : 'Encender linterna'}
          onPress={onToggleTorch}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
          textClassName="text-xl text-white"
        >
          ϟ
        </IconButton>
      ) : (
        <View className="h-11 w-11" />
      )}
    </View>
  );
}

function ScanFrame() {
  return (
    <View className="h-[220px] w-[220px] items-center justify-center rounded-2xl border-2 border-white/80">
      <View className="h-[190px] w-[190px] rounded-xl border border-white/30" />
    </View>
  );
}

function PermissionMessage({ permission, onRequest }) {
  const canAskAgain = permission?.canAskAgain ?? true;
  return (
    <View className="flex-1 items-center justify-center bg-[#1c1a18] px-8">
      <Text className="mb-3 text-4xl text-white">⌖</Text>
      <Text className="text-center text-lg font-bold text-white">
        Necesitamos acceso a tu cámara
      </Text>
      <Text className="mt-2 text-center text-sm leading-5 text-white/70">
        Usa la cámara para escanear el código QR ubicado en tu mesa.
      </Text>
      {canAskAgain ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRequest}
          className="mt-6 rounded-xl bg-[#b7472a] px-6 py-3"
        >
          <Text className="font-bold text-white">Permitir cámara</Text>
        </Pressable>
      ) : (
        <Text className="mt-6 text-center text-sm text-white/70">
          Activa el permiso de cámara desde la configuración de tu dispositivo.
        </Text>
      )}
    </View>
  );
}

function ResultPanel({
  scanner,
  participation,
  cameraError,
  onContinue,
  onRetryCamera,
}) {
  if (cameraError) {
    return (
      <View className="rounded-[24px] bg-[#fff8ef] p-5">
        <Text accessibilityRole="alert" className="text-sm text-[#b7472a]">
          {cameraError}
        </Text>
        <ActionButton label="Reintentar cámara" onPress={onRetryCamera} />
      </View>
    );
  }
  if (scanner.status === 'resolving') {
    return (
      <View className="items-center rounded-[24px] bg-[#fff8ef] p-6">
        <ActivityIndicator color="#b7472a" />
        <Text className="mt-3 text-sm font-semibold text-[#332d28]">
          Consultando mesa…
        </Text>
      </View>
    );
  }
  if (scanner.status === 'resolved' && scanner.table) {
    return (
      <VisitParticipationPanel
        key={scanner.table.visitId}
        scanner={scanner}
        participation={participation}
        onContinue={onContinue}
      />
    );
  }
  if (scanner.status === 'error') {
    return (
      <View className="rounded-[24px] bg-[#fff8ef] p-5">
        <Text
          accessibilityRole="alert"
          className="text-sm leading-5 text-[#b7472a]"
        >
          {scanner.error}
        </Text>
        {scanner.errorStatus === 401 ? (
          <ActionButton
            label="Volver a iniciar sesión"
            onPress={async () => {
              await logoutUser();
              router.replace('/login');
            }}
          />
        ) : null}
        {!scanner.errorStatus || scanner.errorStatus >= 500 ? (
          <ActionButton label="Reintentar consulta" onPress={scanner.retry} />
        ) : null}
        <ActionButton
          label="Escanear otro QR"
          secondary
          onPress={scanner.scanAnother}
        />
      </View>
    );
  }
  return (
    <View className="items-center rounded-[24px] bg-[#fff8ef] p-6">
      <Text className="text-[10px] font-semibold tracking-wide text-[#8b8178]">
        BUSCANDO QR
      </Text>
      <Text className="mt-2 text-center text-base font-bold text-[#332d28]">
        Alinea el código QR dentro del marco
      </Text>
      <Text className="mt-1 text-center text-xs leading-5 text-[#8b8178]">
        La cámara validará la mesa con el servidor.
      </Text>
    </View>
  );
}

function ActionButton({ label, onPress, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`mt-3 min-h-11 items-center justify-center rounded-xl px-4 ${secondary ? 'bg-[#f2e8d6]' : 'bg-[#b7472a]'}`}
    >
      <Text
        className={`text-xs font-semibold ${secondary ? 'text-[#b7472a]' : 'text-white'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TableScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const scanner = useTableQrScanner();
  const participation = useVisitParticipation(
    focused ? scanner.table?.visitId : null,
    scanner.clearAfterContinue,
  );

  useFocusEffect(
    useCallback(() => {
      scanner.activate();
      setFocused(true);
      return () => {
        setFocused(false);
        setTorchEnabled(false);
        scanner.cancel();
      };
    }, [scanner.activate, scanner.cancel]),
  );

  useEffect(() => {
    requestPermission().catch(() => {
      setCameraError('No se pudo solicitar acceso a la cámara.');
    });
  }, [requestPermission]);

  function requestCameraPermission() {
    requestPermission().catch(() => {
      setCameraError('No se pudo solicitar acceso a la cámara.');
    });
  }

  function continueToMenu() {
    if (scanner.status !== 'resolved' || !scanner.table) return;
    const { tableCode } = scanner.table;
    scanner.clearAfterContinue();
    router.push({
      pathname: '/menu',
      params: { service: 'dine-in', table: tableCode },
    });
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-[#1c1a18]">
        <StatusBar style="light" />
        <ScannerHeader showTorch={false} />
        {cameraError ? (
          <Text
            accessibilityRole="alert"
            className="px-8 text-center text-sm text-red-300"
          >
            {cameraError}
          </Text>
        ) : null}
        <PermissionMessage
          permission={permission}
          onRequest={requestCameraPermission}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#1c1a18]">
      <StatusBar style="light" />
      <View className="flex-1 bg-[#1c1a18]">
        <ScannerHeader
          showTorch
          torchEnabled={torchEnabled}
          onToggleTorch={() => setTorchEnabled((enabled) => !enabled)}
        />
        <View className="relative flex-1 overflow-hidden">
          {focused && !cameraError ? (
            <CameraView
              key={cameraKey}
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={
                scanner.status === 'scanning'
                  ? (result) => void scanner.resolve(result.data)
                  : undefined
              }
              onMountError={({ message }) => {
                setCameraError(message || 'No se pudo iniciar la cámara.');
              }}
            />
          ) : null}
          {!cameraError ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(0, 0, 0, 0.2)' },
              ]}
              className="items-center justify-center px-5"
            >
              <ScanFrame />
              <Text className="mt-5 text-center text-sm text-white">
                {scanner.status === 'resolving'
                  ? 'Validando código QR…'
                  : 'Apunta al código QR de tu mesa.'}
              </Text>
            </View>
          ) : null}
        </View>
        <ScrollView
          style={{ maxHeight: '60%' }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 16,
            paddingTop: 12,
          }}
        >
          <ResultPanel
            scanner={scanner}
            participation={participation}
            cameraError={cameraError}
            onContinue={continueToMenu}
            onRetryCamera={() => {
              setCameraError('');
              setCameraKey((key) => key + 1);
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
