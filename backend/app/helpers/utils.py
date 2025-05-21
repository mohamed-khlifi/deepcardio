def parse_float_or_none(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def compare_values(patient_value, min_value_str, max_value_str):
    if min_value_str and min_value_str.strip().startswith(">="):
        threshold = parse_float_or_none(min_value_str.strip()[2:])
        return threshold is not None and patient_value >= threshold

    if min_value_str and min_value_str.strip().startswith(">"):
        threshold = parse_float_or_none(min_value_str.strip()[1:])
        return threshold is not None and patient_value > threshold

    if max_value_str and max_value_str.strip().startswith("<="):
        threshold = parse_float_or_none(max_value_str.strip()[2:])
        return threshold is not None and patient_value <= threshold

    if max_value_str and max_value_str.strip().startswith("<"):
        threshold = parse_float_or_none(max_value_str.strip()[1:])
        return threshold is not None and patient_value < threshold

    min_val = parse_float_or_none(min_value_str)
    max_val = parse_float_or_none(max_value_str)

    if min_val is not None and max_val is not None:
        return min_val <= patient_value <= max_val
    if min_val is not None:
        return patient_value >= min_val
    if max_val is not None:
        return patient_value <= max_val

    return False
