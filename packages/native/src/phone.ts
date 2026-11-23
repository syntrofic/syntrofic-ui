import { AsYouType, getCountries, getCountryCallingCode, isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'
import { nativeDigitText } from './number-state'

export type { CountryCode as NativePhoneCountry }
export interface NativePhoneDetails {
  country?: CountryCode
  callingCode?: string
  nationalNumber: string
  e164?: string
  text: string
  possible: boolean
  valid: boolean
}

export function normalizeNativePhone(raw: string) {
  const trim = nativeDigitText(raw.normalize('NFKC')).trim()
  const digits = trim.replace(/[^0-9]/g, '')
  if (trim.startsWith('+')) return '+' + digits
  if (trim.startsWith('00')) return '+' + digits.slice(2)
  return digits
}

export function nativePhoneDetails(raw: string, country: CountryCode): NativePhoneDetails {
  const defaultCountry = isSupportedCountry(country) ? country : undefined
  const text = normalizeNativePhone(raw)
  const parsed = parsePhoneNumberFromString(text, { defaultCountry, extract: false })
  const typed = new AsYouType(defaultCountry)
  const formatted = typed.input(text)
  const parsedCountry = parsed?.country ?? typed.getCountry()
  const international = text.startsWith('+')
  const callingCode = parsed?.countryCallingCode ?? typed.getCallingCode()
    ?? (!international && defaultCountry ? getCountryCallingCode(defaultCountry) : undefined)
  const remainingDigits = international ? (callingCode ? text.slice(callingCode.length + 1) : '') : text
  return {
    country: parsedCountry ?? (!international ? defaultCountry : undefined),
    callingCode,
    nationalNumber: parsed?.nationalNumber ?? typed.getNumber()?.nationalNumber ?? remainingDigits,
    e164: parsed?.number,
    text: formatted,
    possible: parsed?.isPossible() ?? false,
    valid: parsed?.isValid() ?? false,
  }
}

export function nativePhoneCountries(requested?: readonly CountryCode[]) {
  return (requested ?? getCountries()).filter(country => isSupportedCountry(country)).map(country => ({
    country, callingCode: getCountryCallingCode(country),
  }))
}
