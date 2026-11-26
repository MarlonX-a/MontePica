import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { getSessionSnapshot, subscribeToSession } from '@/shared/session/sessionStore';

const LOCATION_TIMEOUT_MS = 15000;

export default function useDeliveryLocation() {
  const [location, setLocation] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const timer = useRef(null);
  const mounted = useRef(false);
  const capturingRef = useRef(false);
  const sessionGeneration = useRef(getSessionSnapshot().generation);

  const cancel = useCallback(() => {
    requestId.current += 1;
    clearTimeout(timer.current);
    timer.current = null;
    capturingRef.current = false;
    if (mounted.current) setCapturing(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeToSession(() => {
      const nextGeneration = getSessionSnapshot().generation;
      if (sessionGeneration.current === nextGeneration) return;
      sessionGeneration.current = nextGeneration;
      requestId.current += 1;
      clearTimeout(timer.current);
      timer.current = null;
      capturingRef.current = false;
      setCapturing(false);
      setLocation(null);
      setError('');
    });
    return () => {
      mounted.current = false;
      requestId.current += 1;
      clearTimeout(timer.current);
      unsubscribe();
    };
  }, []);

  useFocusEffect(useCallback(() => () => cancel(), [cancel]));

  const capture = useCallback(async () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    const id = ++requestId.current;
    const generation = getSessionSnapshot().generation;
    setCapturing(true);
    setError('');
    const isCurrent = () => mounted.current && requestId.current === id && getSessionSnapshot().generation === generation;

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!isCurrent()) return;
      if (permission.status !== 'granted') {
        setError('No se concedió permiso de ubicación. Puedes continuar escribiendo la dirección.');
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isCurrent()) return;
      if (!servicesEnabled) {
        setError('La ubicación está desactivada en el dispositivo. Puedes continuar escribiendo la dirección.');
        return;
      }

      const timeout = new Promise((_, reject) => {
        timer.current = setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), LOCATION_TIMEOUT_MS);
      });
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        timeout,
      ]);
      if (!isCurrent()) return;
      const { latitude, longitude } = result.coords;
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('LOCATION_INVALID');
      }
      setLocation({ latitude, longitude });
    } catch (captureError) {
      if (!isCurrent()) return;
      setError(captureError.message === 'LOCATION_TIMEOUT'
        ? 'No se obtuvo la ubicación en 15 segundos. Puedes continuar con la dirección escrita.'
        : 'No se pudo obtener la ubicación. Puedes continuar con la dirección escrita.');
    } finally {
      clearTimeout(timer.current);
      timer.current = null;
      if (isCurrent()) {
        capturingRef.current = false;
        setCapturing(false);
      }
    }
  }, []);

  const remove = useCallback(() => {
    cancel();
    setLocation(null);
    setError('');
  }, [cancel]);

  return { location, capturing, error, capture, cancel, remove };
}
