import Common "../types/common";

module {
  public type CauseId = Common.CauseId;
  public type DonationId = Common.DonationId;
  public type Timestamp = Common.Timestamp;

  /// Lifecycle state of a donation.
  public type DonationStatus = {
    #pending;
    #completed;
    #failed;
  };

  /// Stored donation record.
  public type Donation = {
    id : DonationId;
    causeId : CauseId;
    /// Amount in the smallest currency unit (cents).
    amountCents : Nat;
    /// Donor display name; null means the donor chose to give anonymously.
    donorName : ?Text;
    /// Optional public message from the donor.
    message : ?Text;
    /// Stripe checkout session id used as the receipt reference.
    receiptRef : Text;
    status : DonationStatus;
    createdAt : Timestamp;
  };

  /// Public projection of a donation for the cause donor list.
  public type DonationView = {
    id : DonationId;
    causeId : CauseId;
    amountCents : Nat;
    /// "Anonymous" when the donor gave anonymously.
    donorDisplayName : Text;
    message : ?Text;
    receiptRef : Text;
    createdAt : Timestamp;
  };

  /// Input for starting a donation.
  public type DonationInput = {
    causeId : CauseId;
    amountCents : Nat;
    donorName : ?Text;
    message : ?Text;
    /// Absolute URL the donor returns to after a successful payment. Supplied
    /// by the caller so the redirect lands on this app's own origin.
    successUrl : Text;
    /// Absolute URL the donor returns to when the payment is cancelled.
    cancelUrl : Text;
  };

  /// Result of starting a donation: the pending donation id plus the Stripe
  /// checkout session JSON the frontend redirects to.
  public type DonationStart = {
    donationId : DonationId;
    sessionJson : Text;
  };

  /// Errors surfaced by the donation API.
  public type DonationError = {
    #causeNotFound : CauseId;
    #causeNotPublished : CauseId;
    #invalidAmount;
    #donationNotFound : DonationId;
    #paymentNotCompleted : Text;
  };
};
