import { Layout } from "@/components/Layout";
import AdminPage from "@/pages/AdminPage";
import CausePage from "@/pages/CausePage";
import HomePage from "@/pages/HomePage";
import PaymentFailurePage from "@/pages/PaymentFailurePage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const causeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/causes/$causeId",
  component: CausePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const paymentSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-success",
  component: PaymentSuccessPage,
});

const paymentFailureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-failure",
  component: PaymentFailurePage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  causeRoute,
  adminRoute,
  paymentSuccessRoute,
  paymentFailureRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
