import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type CauseId = bigint;
export interface CauseInput {
    title: string;
    description: string;
    goalCents: bigint;
    imageRef: string;
}
export interface CauseView {
    id: CauseId;
    status: CauseStatus;
    title: string;
    createdAt: Timestamp;
    description: string;
    goalCents: bigint;
    imageRef: string;
    raisedCents: bigint;
    progressBps: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface Donation {
    id: DonationId;
    status: DonationStatus;
    receiptRef: string;
    createdAt: Timestamp;
    donorName?: string;
    amountCents: bigint;
    causeId: CauseId;
    message?: string;
}
export type DonationId = bigint;
export interface DonationInput {
    cancelUrl: string;
    donorName?: string;
    amountCents: bigint;
    causeId: CauseId;
    message?: string;
    successUrl: string;
}
export interface DonationStart {
    donationId: DonationId;
    sessionJson: string;
}
export interface DonationView {
    id: DonationId;
    receiptRef: string;
    createdAt: Timestamp;
    amountCents: bigint;
    causeId: CauseId;
    message?: string;
    donorDisplayName: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface HttpHeader {
    value: string;
    name: string;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export type Timestamp = bigint;
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum CauseStatus {
    closed = "closed",
    published = "published",
    draft = "draft"
}
export enum DonationStatus {
    pending = "pending",
    completed = "completed",
    failed = "failed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Owner-only: close a cause.
     */
    closeCause(id: CauseId): Promise<boolean>;
    /**
     * / Public: confirm a completed online payment so the donation is recorded and
     * / the cause amount raised increases. When no Stripe secret key has been saved
     * / there is no gateway to verify against, so the pending donation is recorded
     * / as completed and the cause total increases.
     */
    confirmDonation(donationId: DonationId): Promise<DonationView>;
    /**
     * / Owner-only: create a draft cause.
     */
    createCause(input: CauseInput): Promise<CauseId>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    /**
     * / Owner-only: edit a cause's title, description, image and goal.
     */
    editCause(id: CauseId, input: CauseInput): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Public: read one cause by id.
     */
    getCause(id: CauseId): Promise<CauseView | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    /**
     * / Owner-only: list every cause including drafts and closed ones.
     */
    listAllCauses(): Promise<Array<CauseView>>;
    /**
     * / Public: list published causes with goal, raised and progress.
     */
    listCauses(): Promise<Array<CauseView>>;
    /**
     * / Owner-only: read the full donation ledger for a cause.
     */
    listDonationLedger(causeId: CauseId): Promise<Array<Donation>>;
    /**
     * / Public: list recent completed donations for a cause.
     */
    listRecentDonations(causeId: CauseId, limit: bigint): Promise<Array<DonationView>>;
    /**
     * / Owner-only: publish a cause.
     */
    publishCause(id: CauseId): Promise<boolean>;
    schema(): Promise<string>;
    /**
     * / Owner-only: set a cause's funding goal.
     */
    setCauseGoal(id: CauseId, goalCents: bigint): Promise<boolean>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    /**
     * / Public: start a donation for a published cause. Records a pending donation
     * / and returns the checkout session JSON to redirect to. When no Stripe secret
     * / key has been saved, the donation is still recorded and the returned session
     * / points at this app's own payment step, so a signed-out visitor can always
     * / reach payment in a fresh draft.
     */
    startDonation(input: DonationInput): Promise<DonationStart>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
