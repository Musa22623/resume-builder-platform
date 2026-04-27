export const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (!responseData) {
    return "We couldn't complete your request right now. Please try again in a moment.";
  }

  if (typeof responseData.message === "string") {
    return responseData.message;
  }

  if (typeof responseData.detail === "string") {
    return responseData.detail;
  }

  if (typeof responseData === "string") {
    return responseData;
  }

  const firstEntry = Object.entries(responseData).find(([, value]) => value);
  if (!firstEntry) {
    return fallbackMessage;
  }

  const [field, value] = firstEntry;
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue === "string") {
    const label = field.replace(/_/g, " ");
    return `${label}: ${firstValue}`;
  }

  return fallbackMessage;
};
