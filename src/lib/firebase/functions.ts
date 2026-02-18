import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const getClientFunctions = () => {
  const app = getApp();
  return getFunctions(app);
};

export const fnCalculateBMR = () =>
  httpsCallable(getClientFunctions(), "calculateBMR");

export const fnBookTraining = () =>
  httpsCallable(getClientFunctions(), "bookTraining");

export const fnProcessPayment = () =>
  httpsCallable(getClientFunctions(), "processPayment");

export const fnSendNotification = () =>
  httpsCallable(getClientFunctions(), "sendNotification");

export const fnGenerateReport = () =>
  httpsCallable(getClientFunctions(), "generateReport");

export const fnSyncUserData = () =>
  httpsCallable(getClientFunctions(), "syncUserData");

