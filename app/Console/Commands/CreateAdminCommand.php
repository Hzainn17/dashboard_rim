<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:admin 
                            {--name= : The name of the admin user}
                            {--email= : The email address of the admin user}
                            {--password= : The password for the admin user}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new studio admin user with full access';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Admin Full Name', 'Super Admin RIM');
        $email = $this->option('email') ?: $this->ask('Admin Email Address', 'admin@rimstudio.com');
        $password = $this->option('password') ?: $this->secret('Admin Password (min. 8 characters)');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::query()->create([
            'name' => (string) $name,
            'email' => (string) $email,
            'password' => Hash::make((string) $password),
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        Employee::query()->create([
            'user_id' => $user->id,
            'employee_code' => 'RIM-001',
            'position' => 'Principal Architect',
            'department' => 'Administrasi',
            'work_type' => 'office',
            'join_date' => now()->toDateString(),
            'base_salary' => 0,
            'fixed_allowance' => 0,
            'overtime_rate_per_hour' => 0,
            'bank_name' => 'BCA',
            'bank_account_holder' => $user->name,
            'bank_account_number' => '-',
            'annual_leave_quota' => 12,
            'employment_status' => 'tetap',
        ]);

        $this->info("Admin user '{$user->name}' ({$user->email}) created successfully!");

        return self::SUCCESS;
    }
}
