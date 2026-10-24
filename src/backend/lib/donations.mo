import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Common "../types/common";
import Types "../types/donations";

module {
  /// Convert a stored donation to its public view.
  public func toView(donation : Types.Donation) : Types.DonationView {
    {
      id = donation.id;
      causeId = donation.causeId;
      amountCents = donation.amountCents;
      donorDisplayName = donation.donorName ?? "Anonymous";
      message = donation.message;
      receiptRef = donation.receiptRef;
      createdAt = donation.createdAt;
    };
  };

  /// Record a new pending donation and return its id.
  public func createPending(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    state : { var nextCauseId : Nat; var nextDonationId : Nat },
    input : Types.DonationInput,
    receiptRef : Text,
    now : Common.Timestamp,
  ) : Common.DonationId {
    let id = state.nextDonationId;
    state.nextDonationId := id + 1;
    let donation : Types.Donation = {
      id;
      causeId = input.causeId;
      amountCents = input.amountCents;
      donorName = input.donorName;
      message = input.message;
      receiptRef;
      status = #pending;
      createdAt = now;
    };
    donations.add(id, donation);
    id;
  };

  /// Mark a donation completed and return it.
  public func markCompleted(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    id : Common.DonationId,
  ) : ?Types.Donation {
    switch (donations.get(id)) {
      case (?donation) {
        let updated : Types.Donation = {
          id = donation.id;
          causeId = donation.causeId;
          amountCents = donation.amountCents;
          donorName = donation.donorName;
          message = donation.message;
          receiptRef = donation.receiptRef;
          status = #completed;
          createdAt = donation.createdAt;
        };
        donations.add(id, updated);
        ?updated;
      };
      case null { null };
    };
  };

  /// Mark a donation failed.
  public func markFailed(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    id : Common.DonationId,
  ) : ?Types.Donation {
    switch (donations.get(id)) {
      case (?donation) {
        let updated : Types.Donation = {
          id = donation.id;
          causeId = donation.causeId;
          amountCents = donation.amountCents;
          donorName = donation.donorName;
          message = donation.message;
          receiptRef = donation.receiptRef;
          status = #failed;
          createdAt = donation.createdAt;
        };
        donations.add(id, updated);
        ?updated;
      };
      case null { null };
    };
  };

  /// Set a donation's receipt reference (the Stripe checkout session id).
  public func setReceiptRef(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    id : Common.DonationId,
    receiptRef : Text,
  ) : () {
    switch (donations.get(id)) {
      case (?donation) {
        let updated : Types.Donation = {
          id = donation.id;
          causeId = donation.causeId;
          amountCents = donation.amountCents;
          donorName = donation.donorName;
          message = donation.message;
          receiptRef;
          status = donation.status;
          createdAt = donation.createdAt;
        };
        donations.add(id, updated);
      };
      case null {};
    };
  };

  /// Build the checkout session JSON returned when no Stripe secret key has
  /// been saved. The frontend only needs a non-empty `url` to reach the
  /// payment step, so it points at the caller-supplied success URL on this
  /// app's own origin. The `id` is a local reference, not a Stripe session id.
  public func localSessionJson(donationId : Common.DonationId, successUrl : Text) : Text {
    "{\"id\":\"local-" # donationId.toText() # "\",\"url\":\"" # successUrl # "\"}";
  };

  /// Read one donation by id.
  public func getDonation(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    id : Common.DonationId,
  ) : ?Types.Donation {
    donations.get(id);
  };

  /// List recent completed donations for a cause, newest first, capped at limit.
  public func listRecentForCause(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    causeId : Common.CauseId,
    limit : Nat,
  ) : [Types.DonationView] {
    let completed = donations.values()
      .filter(func(donation) = donation.causeId == causeId and donation.status == #completed)
      .toArray();
    let sorted = completed.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
    let capped = if (sorted.size() > limit) { sorted.sliceToArray(0, limit) } else { sorted };
    capped.map(func(donation) = toView(donation));
  };

  /// List the full donation ledger for a cause, newest first.
  public func listLedgerForCause(
    donations : Map.Map<Common.DonationId, Types.Donation>,
    causeId : Common.CauseId,
  ) : [Types.Donation] {
    let forCause = donations.values()
      .filter(func(donation) = donation.causeId == causeId)
      .toArray();
    forCause.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
  };
};
