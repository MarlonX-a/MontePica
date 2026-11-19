import apiClient from "@/shared/api/apiClient";

export async function getCurrentOperation(signal) {
  const { data } = await apiClient.get("/admin/operations/current", { signal });
  return data;
}

export async function getOperationSettings(signal) {
  const { data } = await apiClient.get("/admin/operations/settings", {
    signal,
  });
  return data;
}

export async function updateOperationSettings(body, signal) {
  const { data } = await apiClient.patch("/admin/operations/settings", body, {
    signal,
  });
  return data;
}

export async function openOperatingDay() {
  const { data } = await apiClient.post("/admin/operations/days/open");
  return data;
}

export async function openOperatingCash(openingAmountCents) {
  const { data } = await apiClient.post("/admin/operations/cash/open", {
    openingAmountCents,
  });
  return data;
}

export async function listCashRegisters(params, signal) {
  const { data } = await apiClient.get("/admin/operations/cash", {
    params,
    signal,
  });
  return data;
}

export async function getOperatingDay(id, signal) {
  const { data } = await apiClient.get(`/admin/operations/days/${id}`, {
    signal,
  });
  return data;
}

export async function getCashClosingPreview(id, params, signal) {
  const { data } = await apiClient.get(
    `/admin/operations/cash/${id}/closing-preview`,
    { params, signal },
  );
  return data;
}

export async function getOperatingDayClosingPreview(id, params, signal) {
  const { data } = await apiClient.get(
    `/admin/operations/days/${id}/closing-preview`,
    { params, signal },
  );
  return data;
}

export async function closeCashRegister(id, body, key) {
  const { data } = await apiClient.post(
    `/admin/operations/cash/${id}/close`,
    body,
    {
      headers: { "Idempotency-Key": key },
    },
  );
  return data;
}

export async function closeOperatingDay(id, body, key) {
  const { data } = await apiClient.post(
    `/admin/operations/days/${id}/close`,
    body,
    {
      headers: { "Idempotency-Key": key },
    },
  );
  return data;
}

export async function getCashClosure(id, signal) {
  const { data } = await apiClient.get(`/admin/operations/cash/${id}/closure`, {
    signal,
  });
  return data;
}

export async function getOperatingDayClosure(id, signal) {
  const { data } = await apiClient.get(`/admin/operations/days/${id}/closure`, {
    signal,
  });
  return data;
}

export function getOperationsAdminError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  if (error.response?.status === 401)
    return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (error.response?.status === 403)
    return "Tu cuenta no tiene permiso para esta operación.";
  if (!error.response)
    return "No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.";
  return "No se pudo completar la operación. Actualiza los datos e inténtalo de nuevo.";
}
