import type { VetContact } from "../../lib/types";
import "./VetList.css";

interface VetListProps {
  countries: string[];
  contactsByCountry: Map<string, VetContact[]>;
  onEdit: (contact: VetContact) => void;
  onAddForCountry: (country: string) => void;
}

export function VetList({
  countries,
  contactsByCountry,
  onEdit,
  onAddForCountry,
}: VetListProps) {
  return (
    <div className="vet-list">
      {countries.map((country) => {
        const contacts = contactsByCountry.get(country) ?? [];
        return (
          <div key={country} className="vet-list__group">
            <h4>{country}</h4>
            <ul>
              {contacts.map((contact) => {
                const isEmpty = !contact.city && !contact.name && !contact.phone;
                return (
                  <li key={contact.id}>
                    <button type="button" onClick={() => onEdit(contact)}>
                      {isEmpty ? (
                        <span className="vet-list__placeholder">À compléter…</span>
                      ) : (
                        <>
                          <span className="vet-list__name">
                            {contact.name || contact.city || "Vétérinaire"}
                          </span>
                          {contact.city && contact.name && (
                            <span className="vet-list__city">{contact.city}</span>
                          )}
                          {contact.phone && (
                            <span className="vet-list__phone">{contact.phone}</span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="vet-list__add"
              onClick={() => onAddForCountry(country)}
            >
              + Ajouter un vétérinaire pour {country}
            </button>
          </div>
        );
      })}
    </div>
  );
}
