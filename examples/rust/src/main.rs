use std::env;
use std::fs;
use std::process;

mod processor;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("Usage: {} <filename>", args[0]);
        process::exit(1);
    }

    let filename = &args[1];

    match fs::read_to_string(filename) {
        Ok(contents) => {
            let processed = processor::process_content(&contents);
            print!("{}", processed);
        }
        Err(err) => {
            eprintln!("Error reading file '{}': {}", filename, err);
            process::exit(1);
        }
    }
}
