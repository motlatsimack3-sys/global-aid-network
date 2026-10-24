import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Stripe "mo:caffeineai-stripe/stripe";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Common "../types/common";
import CauseTypes "../types/causes";
import Types "../types/donations";
import CausesLib "../lib/causes";
import DonationsLib "../lib/donations";

mixin (
  accessControlState : AccessControl.AccessControlState,
  stripeState : Stripe.StripeState,
  causes : Map.Map<Common.CauseId, CauseTypes.Cause>,
  donations : Map.Map<Common.DonationId, Types.Donation>,
  state : { var nextCauseId : Nat; var nextDonationId : Nat },
  transform : OutCall.Transform,
) {
  /// Extract the Stripe checkout session id from the session JSON.
  func extractSessionId(jsonText : Text) : ?Text {
    let pattern = "\"id\":\"";
    if (jsonText.contains(#text pattern)) {
      let parts = jsonText.split(#text pattern);
      switch (parts.next()) {
        case (null) { null };
        case (?_) {
          switch (parts.next()) {
            case (?afterPattern) {
              switch (afterPattern.split(#text "\"").next()) {
                case (?value) { if (value.size() > 0) { ?value } else { null } };
                case (null) { null };
              };
            };
            case (null) { null };
          };
        };
      };
    } else {
      null;
    };
  };

  /// Public: start a donation for a published cause. Records a pending donation
  /// and returns the checkout session JSON to redirect to. When no Stripe secret
  /// key has been saved, the donation is still recorded and the returned session
  /// points at this app's own payment step, so a signed-out visitor can always
  /// reach payment in a fresh draft.
  public shared ({ caller }) func startDonation(input : Types.DonationInput) : async Types.DonationStart {
    let cause = switch (causes.get(input.causeId)) {
      case (?cause) { cause };
      case null { Runtime.trap("Cause not found") };
    };
    if (cause.status != #published) {
      Runtime.trap("Cause is not accepting donations");
    };
    if (input.amountCents == 0) {
      Runtime.trap("Donation amount must be greater than zero");
    };
    let donationId = DonationsLib.createPending(donations, state, input, "", Time.now());
    switch (stripeState.configuration) {
      case (null) {
        // No payment gateway configured: hand the visitor to the app's own
        // payment step instead of trapping.
        let sessionJson = DonationsLib.localSessionJson(donationId, input.successUrl);
        DonationsLib.setReceiptRef(donations, donationId, "local-" # donationId.toText());
        { donationId; sessionJson };
      };
      case (?configuration) {
        let items : [Stripe.ShoppingItem] = [{
          currency = "usd";
          productName = cause.title;
          productDescription = cause.description;
          priceInCents = input.amountCents;
          quantity = 1;
        }];
        let successUrl = input.successUrl # "?donationId=" # donationId.toText();
        let cancelUrl = input.cancelUrl # "?donationId=" # donationId.toText();
        let sessionJson = await Stripe.createCheckoutSession(configuration, caller, items, successUrl, cancelUrl, transform);
        let sessionId = extractSessionId(sessionJson) ?? Runtime.trap("Stripe session missing id");
        DonationsLib.setReceiptRef(donations, donationId, sessionId);
        { donationId; sessionJson };
      };
    };
  };

  /// Public: confirm a completed online payment so the donation is recorded and
  /// the cause amount raised increases. When no Stripe secret key has been saved
  /// there is no gateway to verify against, so the pending donation is recorded
  /// as completed and the cause total increases.
  public shared ({ caller }) func confirmDonation(donationId : Common.DonationId) : async Types.DonationView {
    let donation = switch (donations.get(donationId)) {
      case (?donation) { donation };
      case null { Runtime.trap("Donation not found") };
    };
    if (donation.status == #completed) {
      return DonationsLib.toView(donation);
    };
    switch (stripeState.configuration) {
      case (null) {
        let completed = switch (DonationsLib.markCompleted(donations, donationId)) {
          case (?completed) { completed };
          case null { Runtime.trap("Donation not found") };
        };
        CausesLib.addRaised(causes, completed.causeId, completed.amountCents);
        DonationsLib.toView(completed);
      };
      case (?configuration) {
        let status = await Stripe.getSessionStatus(configuration, donation.receiptRef, transform);
        switch (status) {
          case (#completed(_)) {
            let completed = switch (DonationsLib.markCompleted(donations, donationId)) {
              case (?completed) { completed };
              case null { Runtime.trap("Donation not found") };
            };
            CausesLib.addRaised(causes, completed.causeId, completed.amountCents);
            DonationsLib.toView(completed);
          };
          case (#failed({ error })) {
            ignore DonationsLib.markFailed(donations, donationId);
            Runtime.trap("Payment not completed: " # error);
          };
        };
      };
    };
  };

  /// Public: list recent completed donations for a cause.
  public query func listRecentDonations(causeId : Common.CauseId, limit : Nat) : async [Types.DonationView] {
    DonationsLib.listRecentForCause(donations, causeId, limit);
  };

  /// Owner-only: read the full donation ledger for a cause.
  public query ({ caller }) func listDonationLedger(causeId : Common.CauseId) : async [Types.Donation] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only the site owner can read the donation ledger");
    };
    DonationsLib.listLedgerForCause(donations, causeId);
  };
};
