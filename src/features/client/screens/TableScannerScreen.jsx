import { useEffect, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import IconButton from "@/features/client/components/IconButton";

const MOCK_SCANNED_TABLE = "Mesa 08";

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
          label={torchEnabled ? "Apagar linterna" : "Encender linterna"}
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

export default function TableScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-[#1c1a18]">
        <StatusBar style="light" />
        <ScannerHeader showTorch={false} />
        <PermissionMessage
          permission={permission}
          onRequest={requestPermission}
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
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            enableTorch={torchEnabled}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(0, 0, 0, 0.2)",
              },
            ]}
            className="items-center justify-center px-5"
          >
            <ScanFrame />
            <Text className="mt-5 text-center text-sm text-white">
              Código QR de tu mesa reconocido.
            </Text>
          </View>
        </View>

        <View className="px-5 pb-4 pt-3">
          <View className="rounded-[24px] bg-[#fff8ef] px-4 pb-4 pt-4">
            <View className="mb-4 flex-row items-center">
              <View
                className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#dcebdc]"
              >
                <Text className="text-xl text-[#34704f]">✓</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold tracking-wide text-[#8b8178]">
                  CÓDIGO RECONOCIDO
                </Text>
                <Text
                  className="mt-0.5 text-lg font-bold text-[#332d28]"
                  numberOfLines={1}
                >
                  {MOCK_SCANNED_TABLE}
                </Text>
                <Text className="mt-0.5 text-xs text-[#8b8178]">
                  Salón principal · 4 personas
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continuar al menú"
              onPress={() =>
                router.push({
                  pathname: "/menu",
                  params: { service: "dine-in", table: MOCK_SCANNED_TABLE },
                })
              }
              className="h-12 flex-row items-center justify-center rounded-xl bg-[#b7472a]"
            >
              <Text className="mr-2 text-white">→</Text>
              <Text className="font-bold text-white">Continuar al menú</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
