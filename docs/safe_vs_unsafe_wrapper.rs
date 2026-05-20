fn add_one_safe(value: i32) -> i32 {
    value + 1
}

unsafe fn add_one_unsafe_wrapper(value: i32) -> i32 {
    // Bad: this does not need unsafe.
    add_one_safe(value)
}

unsafe fn crash_if_null(number: *const i32) -> i32 {
    // This is why unsafe matters: Rust cannot check if this pointer is valid.
    *number + 1
}

fn main() {
    let safe_result = add_one_safe(41);
    println!("safe: {safe_result}");

    let unsafe_result = unsafe { add_one_unsafe_wrapper(41) };
    println!("unsafe: {unsafe_result}");

    let number = 41;
    let pointer = &number;
    let pointer_result = unsafe { crash_if_null(pointer) };
    println!("pointer: {pointer_result}");

    println!("Why bad? If pointer is null, unsafe can crash.");
}
