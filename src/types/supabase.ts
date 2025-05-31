export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id: string
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      airport_transfer: {
        Row: {
          airport_location: string | null
          booking_code: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          distance: string | null
          driver_id: string | null
          driver_name: string | null
          dropoff_location: string | null
          duration: string | null
          fromLocation: Json | null
          id: number
          id_driver: number | null
          license_plate: string | null
          make: string | null
          model: string | null
          passenger: number | null
          payment_method: string | null
          phone: string | null
          pickup_date: string | null
          pickup_location: string | null
          pickup_time: string | null
          price: number | null
          status: Database["public"]["Enums"]["transfer_status"] | null
          toLocation: Json | null
          type: string | null
          vehicle_name: string | null
        }
        Insert: {
          airport_location?: string | null
          booking_code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          distance?: string | null
          driver_id?: string | null
          driver_name?: string | null
          dropoff_location?: string | null
          duration?: string | null
          fromLocation?: Json | null
          id?: number
          id_driver?: number | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          passenger?: number | null
          payment_method?: string | null
          phone?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          toLocation?: Json | null
          type?: string | null
          vehicle_name?: string | null
        }
        Update: {
          airport_location?: string | null
          booking_code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          distance?: string | null
          driver_id?: string | null
          driver_name?: string | null
          dropoff_location?: string | null
          duration?: string | null
          fromLocation?: Json | null
          id?: number
          id_driver?: number | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          passenger?: number | null
          payment_method?: string | null
          phone?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          toLocation?: Json | null
          type?: string | null
          vehicle_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airport_transfer_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_transfer_notifications: {
        Row: {
          created_at: string | null
          driver_id: string
          id: number
          message: string | null
          status: string | null
          transfer_id: number
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: number
          message?: string | null
          status?: string | null
          transfer_id: number
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: number
          message?: string | null
          status?: string | null
          transfer_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_transfer_id"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "airport_transfer"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_transfer_payments: {
        Row: {
          airport_transfer_id: number
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          is_partial_payment: boolean | null
          payment_method: string
          status: string | null
          status_payment: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          airport_transfer_id: number
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_partial_payment?: boolean | null
          payment_method: string
          status?: string | null
          status_payment?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          airport_transfer_id?: number
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_partial_payment?: boolean | null
          payment_method?: string
          status?: string | null
          status_payment?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_airport_transfer"
            columns: ["airport_transfer_id"]
            isOneToOne: false
            referencedRelation: "airport_transfer"
            referencedColumns: ["id"]
          },
        ]
      }
      api_settings: {
        Row: {
          created_at: string | null
          fonte_api_key: string | null
          google_maps_key: string | null
          id: number
          openai_api_key: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fonte_api_key?: string | null
          google_maps_key?: string | null
          id: number
          openai_api_key?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fonte_api_key?: string | null
          google_maps_key?: string | null
          id?: number
          openai_api_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          id: string
          location_check_in: Json | null
          location_check_out: Json | null
          selfie_check_in: string | null
          selfie_check_out: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          id?: string
          location_check_in?: Json | null
          location_check_out?: Json | null
          selfie_check_in?: string | null
          selfie_check_out?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          location_check_in?: Json | null
          location_check_out?: Json | null
          selfie_check_in?: string | null
          selfie_check_out?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_cars: {
        Row: {
          basic_price: number | null
          car_type: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          driver_name: string | null
          dsp_name: string | null
          id: number
          katim_name: string | null
          kode_booking: string | null
          paid_type: string | null
          parking: number | null
          pickup_date: string | null
          plat_no: string | null
          sell_price: number | null
          status: string | null
          surcharge: number | null
          timer: number | null
          upselling: number | null
          user_id: string | null
        }
        Insert: {
          basic_price?: number | null
          car_type?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          driver_name?: string | null
          dsp_name?: string | null
          id?: number
          katim_name?: string | null
          kode_booking?: string | null
          paid_type?: string | null
          parking?: number | null
          pickup_date?: string | null
          plat_no?: string | null
          sell_price?: number | null
          status?: string | null
          surcharge?: number | null
          timer?: number | null
          upselling?: number | null
          user_id?: string | null
        }
        Update: {
          basic_price?: number | null
          car_type?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          driver_name?: string | null
          dsp_name?: string | null
          id?: number
          katim_name?: string | null
          kode_booking?: string | null
          paid_type?: string | null
          parking?: number | null
          pickup_date?: string | null
          plat_no?: string | null
          sell_price?: number | null
          status?: string | null
          surcharge?: number | null
          timer?: number | null
          upselling?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount: number | null
          bank_account: string | null
          booking_date: string | null
          created_at: string | null
          customer_id: string | null
          DATE_PART: number | null
          discount_percent: number | null
          driver_id: string | null
          driver_name: string | null
          driver_option: string | null
          duration: number | null
          end_date: string | null
          id: string
          kode_booking: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          notes: string | null
          overdue: number | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_time: string | null
          plate_number: string | null
          remaining_payments: number | null
          return_time: string | null
          role_id: number | null
          role_name: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
          total_amount: number | null
          transaction_id: string | null
          user_id: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_type: string | null
          with_driver: boolean | null
        }
        Insert: {
          amount?: number | null
          bank_account?: string | null
          booking_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          DATE_PART?: number | null
          discount_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_option?: string | null
          duration?: number | null
          end_date?: string | null
          id?: string
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          overdue?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          return_time?: string | null
          role_id?: number | null
          role_name?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_type?: string | null
          with_driver?: boolean | null
        }
        Update: {
          amount?: number | null
          bank_account?: string | null
          booking_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          DATE_PART?: number | null
          discount_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_option?: string | null
          duration?: number | null
          end_date?: string | null
          id?: string
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          overdue?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          return_time?: string | null
          role_id?: number | null
          role_name?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_type?: string | null
          with_driver?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bookings_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vehicle"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_backup: {
        Row: {
          amount: number | null
          bank_account: string | null
          booking_date: string | null
          created_at: string | null
          customer_id: string | null
          DATE_PART: number | null
          discount_percent: number | null
          driver_id: string | null
          driver_name: string | null
          driver_option: string | null
          duration: number | null
          end_date: string | null
          id: string | null
          kode_booking: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          notes: string | null
          overdue: number | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_time: string | null
          plate_number: string | null
          remaining_payments: number | null
          return_time: string | null
          role_id: number | null
          role_name: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
          total_amount: number | null
          transaction_id: string | null
          user_id: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_type: string | null
          with_driver: boolean | null
        }
        Insert: {
          amount?: number | null
          bank_account?: string | null
          booking_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          DATE_PART?: number | null
          discount_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_option?: string | null
          duration?: number | null
          end_date?: string | null
          id?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          overdue?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          return_time?: string | null
          role_id?: number | null
          role_name?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_type?: string | null
          with_driver?: boolean | null
        }
        Update: {
          amount?: number | null
          bank_account?: string | null
          booking_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          DATE_PART?: number | null
          discount_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_option?: string | null
          duration?: number | null
          end_date?: string | null
          id?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          overdue?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          return_time?: string | null
          role_id?: number | null
          role_name?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_type?: string | null
          with_driver?: boolean | null
        }
        Relationships: []
      }
      bookings_backup_step2: {
        Row: {
          amount: number | null
          bank_account: string | null
          booking_date: string | null
          created_at: string | null
          customer_id: string | null
          DATE_PART: number | null
          discount_percent: number | null
          driver_id: string | null
          driver_name: string | null
          driver_option: string | null
          duration: number | null
          end_date: string | null
          id: string | null
          kode_booking: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          notes: string | null
          overdue: number | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_time: string | null
          plate_number: string | null
          remaining_payments: number | null
          return_time: string | null
          role_id: number | null
          role_name: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
          total_amount: number | null
          transaction_id: string | null
          user_id: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_type: string | null
          with_driver: boolean | null
        }
        Insert: {
          amount?: number | null
          bank_account?: string | null
          booking_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          DATE_PART?: number | null
          discount_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_option?: string | null
          duration?: number | null
          end_date?: string | null
          id?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          overdue?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          return_time?: string | null
          role_id?: number | null
          role_name?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_type?: string | null
          with_driver?: boolean | null
        }
        Update: {
          amount?: number | null
          bank_account?: string | null
          booking_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          DATE_PART?: number | null
          discount_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_option?: string | null
          duration?: number | null
          end_date?: string | null
          id?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          overdue?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          return_time?: string | null
          role_id?: number | null
          role_name?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_type?: string | null
          with_driver?: boolean | null
        }
        Relationships: []
      }
      bookings_trips: {
        Row: {
          bank_account: string | null
          created_at: string
          detail_layanan: string | null
          driver_name: string | null
          durasi: number | null
          fee_sales: number | null
          harga_basic: number | null
          harga_jual: number | null
          id: string
          jenis_kendaraan: string | null
          jenis_layanan: string | null
          jumlah: number | null
          jumlah_hari: number | null
          jumlah_kamar: number | null
          jumlah_malam: number | null
          jumlah_penumpang: string | null
          keterangan: string | null
          kode_booking: string | null
          license_plate: string | null
          lokasi: string | null
          lokasi_hotel: string | null
          maskapai: string | null
          nama_hotel: string | null
          nama_layanan: string | null
          nomor_plat: string | null
          passenger_name: string | null
          payment_method: string | null
          profit: number | null
          quantity: number | null
          rute_penerbangan: string | null
          service_type: string | null
          status: string | null
          tanggal: string | null
          tanggal_checkin: string | null
          tanggal_checkout: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          terminal: string | null
          total_harga: number | null
          tujuan: string | null
          type_unit: string | null
          user_id: string | null
        }
        Insert: {
          bank_account?: string | null
          created_at?: string
          detail_layanan?: string | null
          driver_name?: string | null
          durasi?: number | null
          fee_sales?: number | null
          harga_basic?: number | null
          harga_jual?: number | null
          id?: string
          jenis_kendaraan?: string | null
          jenis_layanan?: string | null
          jumlah?: number | null
          jumlah_hari?: number | null
          jumlah_kamar?: number | null
          jumlah_malam?: number | null
          jumlah_penumpang?: string | null
          keterangan?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          lokasi?: string | null
          lokasi_hotel?: string | null
          maskapai?: string | null
          nama_hotel?: string | null
          nama_layanan?: string | null
          nomor_plat?: string | null
          passenger_name?: string | null
          payment_method?: string | null
          profit?: number | null
          quantity?: number | null
          rute_penerbangan?: string | null
          service_type?: string | null
          status?: string | null
          tanggal?: string | null
          tanggal_checkin?: string | null
          tanggal_checkout?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          terminal?: string | null
          total_harga?: number | null
          tujuan?: string | null
          type_unit?: string | null
          user_id?: string | null
        }
        Update: {
          bank_account?: string | null
          created_at?: string
          detail_layanan?: string | null
          driver_name?: string | null
          durasi?: number | null
          fee_sales?: number | null
          harga_basic?: number | null
          harga_jual?: number | null
          id?: string
          jenis_kendaraan?: string | null
          jenis_layanan?: string | null
          jumlah?: number | null
          jumlah_hari?: number | null
          jumlah_kamar?: number | null
          jumlah_malam?: number | null
          jumlah_penumpang?: string | null
          keterangan?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          lokasi?: string | null
          lokasi_hotel?: string | null
          maskapai?: string | null
          nama_hotel?: string | null
          nama_layanan?: string | null
          nomor_plat?: string | null
          passenger_name?: string | null
          payment_method?: string | null
          profit?: number | null
          quantity?: number | null
          rute_penerbangan?: string | null
          service_type?: string | null
          status?: string | null
          tanggal?: string | null
          tanggal_checkin?: string | null
          tanggal_checkout?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          terminal?: string | null
          total_harga?: number | null
          tujuan?: string | null
          type_unit?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          work_place_id: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          work_place_id?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          work_place_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_work_place_id_fkey"
            columns: ["work_place_id"]
            isOneToOne: false
            referencedRelation: "work_places"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          balance_total: number | null
          code: string | null
          created_at: string
          credit_total: number | null
          current_balance: number | null
          debit_total: number | null
          description: string | null
          id: string
          is_header: boolean | null
          name: string | null
          normal_balance: string | null
          parent_id: string | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          balance_total?: number | null
          code?: string | null
          created_at?: string
          credit_total?: number | null
          current_balance?: number | null
          debit_total?: number | null
          description?: string | null
          id?: string
          is_header?: boolean | null
          name?: string | null
          normal_balance?: string | null
          parent_id?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          balance_total?: number | null
          code?: string | null
          created_at?: string
          credit_total?: number | null
          current_balance?: number | null
          debit_total?: number | null
          description?: string | null
          id?: string
          is_header?: boolean | null
          name?: string | null
          normal_balance?: string | null
          parent_id?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "coa_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "coa_saldo_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "coa_summary_view"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          category: string | null
          created_at: string | null
          damage_value: number
          description: string | null
          id: string
          inspection_id: string | null
          item_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          damage_value?: number
          description?: string | null
          id?: string
          inspection_id?: string | null
          item_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          damage_value?: number
          description?: string | null
          id?: string
          inspection_id?: string | null
          item_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inspection"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          customer_code: string | null
          email: string | null
          full_name: string | null
          id: string
          ktp_paspor_url: string | null
          name: string | null
          phone: string | null
          role_id: number | null
          role_name: string | null
          selfie_url: string | null
          tempat_lahir: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          customer_code?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ktp_paspor_url?: string | null
          name?: string | null
          phone?: string | null
          role_id?: number | null
          role_name?: string | null
          selfie_url?: string | null
          tempat_lahir?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          customer_code?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ktp_paspor_url?: string | null
          name?: string | null
          phone?: string | null
          role_id?: number | null
          role_name?: string | null
          selfie_url?: string | null
          tempat_lahir?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      damages: {
        Row: {
          amount: number | null
          booking_id: string | null
          created_at: string | null
          description: string | null
          id: string
          payment_id: string | null
          payment_status: string | null
        }
        Insert: {
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
        }
        Update: {
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "damages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_favorites: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          plate_number: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          plate_number?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          plate_number?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          address: string | null
          agama: string | null
          alamat: string | null
          back_image_url: string | null
          birth_date: string | null
          birth_place: string | null
          bpkb_url: string | null
          category: string | null
          color: string | null
          created_at: string | null
          discount_percent: number | null
          driver_status: string | null
          driver_type: string | null
          email: string | null
          emergency_contact: string | null
          family_phone: string | null
          first_name: string | null
          front_image_url: string | null
          fuel_type: string | null
          full_name: string | null
          id: string
          id_driver: number | null
          interior_image_url: string | null
          is_online: boolean | null
          kk_url: string | null
          ktp_address: string | null
          ktp_number: string | null
          ktp_url: string | null
          last_name: string | null
          license_expiry: string | null
          license_number: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          nickname: string | null
          no_urut: number | null
          overdue_days: number | null
          phone: string | null
          phone_number: number | null
          reference_phone: number | null
          relative_phone: string | null
          religion: string | null
          role_id: number | null
          role_name: string | null
          saldo: number | null
          seats: number | null
          selfie_url: string | null
          side_image_url: string | null
          sim_url: string | null
          skck_image: string | null
          skck_url: string | null
          status: string | null
          stnk_expiry: string | null
          stnk_url: string | null
          suku: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          total_overdue: number | null
          transmission: string | null
          type: string | null
          updated_at: string | null
          vehicle_type: string | null
          year: number | null
        }
        Insert: {
          address?: string | null
          agama?: string | null
          alamat?: string | null
          back_image_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          bpkb_url?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          discount_percent?: number | null
          driver_status?: string | null
          driver_type?: string | null
          email?: string | null
          emergency_contact?: string | null
          family_phone?: string | null
          first_name?: string | null
          front_image_url?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          id_driver?: number | null
          interior_image_url?: string | null
          is_online?: boolean | null
          kk_url?: string | null
          ktp_address?: string | null
          ktp_number?: string | null
          ktp_url?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          nickname?: string | null
          no_urut?: number | null
          overdue_days?: number | null
          phone?: string | null
          phone_number?: number | null
          reference_phone?: number | null
          relative_phone?: string | null
          religion?: string | null
          role_id?: number | null
          role_name?: string | null
          saldo?: number | null
          seats?: number | null
          selfie_url?: string | null
          side_image_url?: string | null
          sim_url?: string | null
          skck_image?: string | null
          skck_url?: string | null
          status?: string | null
          stnk_expiry?: string | null
          stnk_url?: string | null
          suku?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          total_overdue?: number | null
          transmission?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Update: {
          address?: string | null
          agama?: string | null
          alamat?: string | null
          back_image_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          bpkb_url?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          discount_percent?: number | null
          driver_status?: string | null
          driver_type?: string | null
          email?: string | null
          emergency_contact?: string | null
          family_phone?: string | null
          first_name?: string | null
          front_image_url?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          id_driver?: number | null
          interior_image_url?: string | null
          is_online?: boolean | null
          kk_url?: string | null
          ktp_address?: string | null
          ktp_number?: string | null
          ktp_url?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          nickname?: string | null
          no_urut?: number | null
          overdue_days?: number | null
          phone?: string | null
          phone_number?: number | null
          reference_phone?: number | null
          relative_phone?: string | null
          religion?: string | null
          role_id?: number | null
          role_name?: string | null
          saldo?: number | null
          seats?: number | null
          selfie_url?: string | null
          side_image_url?: string | null
          sim_url?: string | null
          skck_image?: string | null
          skck_url?: string | null
          status?: string | null
          stnk_expiry?: string | null
          stnk_url?: string | null
          suku?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          total_overdue?: number | null
          transmission?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Relationships: []
      }
      drivers_travelincars: {
        Row: {
          address: string | null
          agama: string | null
          alamat: string | null
          back_image_url: string | null
          birth_date: string | null
          birth_place: string | null
          bpkb_url: string | null
          category: string | null
          color: string | null
          created_at: string | null
          discount_percent: number | null
          driver_type: string | null
          email: string | null
          emergency_contact: string | null
          family_phone: string | null
          first_name: string | null
          front_image_url: string | null
          fuel_type: string | null
          full_name: string | null
          id: string
          id_driver: number | null
          interior_image_url: string | null
          kk_url: string | null
          ktp_address: string | null
          ktp_number: string | null
          ktp_url: string | null
          last_name: string | null
          license_expiry: string | null
          license_number: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          nickname: string | null
          no_urut: number | null
          overdue_days: number | null
          phone: string | null
          phone_number: number | null
          reference_phone: number | null
          relative_phone: string | null
          religion: string | null
          role_id: number | null
          role_name: string | null
          saldo: number | null
          seats: number | null
          selfie_url: string | null
          side_image_url: string | null
          sim_url: string | null
          skck_image: string | null
          skck_url: string | null
          status: string | null
          stnk_expiry: string | null
          stnk_url: string | null
          suku: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          total_overdue: number | null
          transmission: string | null
          type: string | null
          updated_at: string | null
          vehicle_type: string | null
          year: number | null
        }
        Insert: {
          address?: string | null
          agama?: string | null
          alamat?: string | null
          back_image_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          bpkb_url?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          discount_percent?: number | null
          driver_type?: string | null
          email?: string | null
          emergency_contact?: string | null
          family_phone?: string | null
          first_name?: string | null
          front_image_url?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          id_driver?: number | null
          interior_image_url?: string | null
          kk_url?: string | null
          ktp_address?: string | null
          ktp_number?: string | null
          ktp_url?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          nickname?: string | null
          no_urut?: number | null
          overdue_days?: number | null
          phone?: string | null
          phone_number?: number | null
          reference_phone?: number | null
          relative_phone?: string | null
          religion?: string | null
          role_id?: number | null
          role_name?: string | null
          saldo?: number | null
          seats?: number | null
          selfie_url?: string | null
          side_image_url?: string | null
          sim_url?: string | null
          skck_image?: string | null
          skck_url?: string | null
          status?: string | null
          stnk_expiry?: string | null
          stnk_url?: string | null
          suku?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          total_overdue?: number | null
          transmission?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Update: {
          address?: string | null
          agama?: string | null
          alamat?: string | null
          back_image_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          bpkb_url?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          discount_percent?: number | null
          driver_type?: string | null
          email?: string | null
          emergency_contact?: string | null
          family_phone?: string | null
          first_name?: string | null
          front_image_url?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          id_driver?: number | null
          interior_image_url?: string | null
          kk_url?: string | null
          ktp_address?: string | null
          ktp_number?: string | null
          ktp_url?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          nickname?: string | null
          no_urut?: number | null
          overdue_days?: number | null
          phone?: string | null
          phone_number?: number | null
          reference_phone?: number | null
          relative_phone?: string | null
          religion?: string | null
          role_id?: number | null
          role_name?: string | null
          saldo?: number | null
          seats?: number | null
          selfie_url?: string | null
          side_image_url?: string | null
          sim_url?: string | null
          skck_image?: string | null
          skck_url?: string | null
          status?: string | null
          stnk_expiry?: string | null
          stnk_url?: string | null
          suku?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          total_overdue?: number | null
          transmission?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Relationships: []
      }
      employee_location_assignments: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          location_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          location_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_location_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_location_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "geofence_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar: string | null
          branch: string
          branch_id: string | null
          created_at: string | null
          division: string
          employee_id: string
          full_name: string | null
          id: string
          name: string
          role_id: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          branch: string
          branch_id?: string | null
          created_at?: string | null
          division: string
          employee_id: string
          full_name?: string | null
          id?: string
          name: string
          role_id?: number | null
          status: string
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          branch?: string
          branch_id?: string | null
          created_at?: string | null
          division?: string
          employee_id?: string
          full_name?: string | null
          id?: string
          name?: string
          role_id?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_employees_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_statuses: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      freelance_payments: {
        Row: {
          amount: number
          bonus_amount: number | null
          created_at: string | null
          date: string
          freelancer_id: string | null
          hours: number | null
          id: string
          payment_type: string
          project_id: string | null
          rate: number | null
          rating: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bonus_amount?: number | null
          created_at?: string | null
          date: string
          freelancer_id?: string | null
          hours?: number | null
          id?: string
          payment_type: string
          project_id?: string | null
          rate?: number | null
          rating?: number | null
          status: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bonus_amount?: number | null
          created_at?: string | null
          date?: string
          freelancer_id?: string | null
          hours?: number | null
          id?: string
          payment_type?: string
          project_id?: string | null
          rate?: number | null
          rating?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelance_payments_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelance_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "freelance_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      freelance_projects: {
        Row: {
          assigned_to: string | null
          budget: string
          category: string
          created_at: string | null
          deadline: string
          description: string
          id: string
          payment_type: string
          progress: number | null
          rating: number | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget: string
          category: string
          created_at?: string | null
          deadline: string
          description: string
          id?: string
          payment_type: string
          progress?: number | null
          rating?: number | null
          status: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget?: string
          category?: string
          created_at?: string | null
          deadline?: string
          description?: string
          id?: string
          payment_type?: string
          progress?: number | null
          rating?: number | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelance_projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      freelance_shift_assignments: {
        Row: {
          created_at: string | null
          freelancer_id: string | null
          id: string
          shift_id: string | null
        }
        Insert: {
          created_at?: string | null
          freelancer_id?: string | null
          id?: string
          shift_id?: string | null
        }
        Update: {
          created_at?: string | null
          freelancer_id?: string | null
          id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelance_shift_assignments_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelance_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "freelance_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      freelance_shifts: {
        Row: {
          branch: string
          capacity: number
          created_at: string | null
          date: string
          end_time: string
          id: string
          name: string
          start_time: string
          status: string
          updated_at: string | null
        }
        Insert: {
          branch: string
          capacity: number
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          name: string
          start_time: string
          status: string
          updated_at?: string | null
        }
        Update: {
          branch?: string
          capacity?: number
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          name?: string
          start_time?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      general_ledger: {
        Row: {
          account_code: string | null
          account_id: string
          account_name: string | null
          account_type: string | null
          balance: number | null
          created_at: string
          credit: number | null
          date: string
          debit: number | null
          description: string | null
          id: string
          is_manual_entry: string | null
          journal_entry_id: string | null
          manual_entry: boolean | null
          period_month: string | null
          running_balance: number
          total_credit: number | null
          total_debit: number | null
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          account_id: string
          account_name?: string | null
          account_type?: string | null
          balance?: number | null
          created_at?: string
          credit?: number | null
          date: string
          debit?: number | null
          description?: string | null
          id?: string
          is_manual_entry?: string | null
          journal_entry_id?: string | null
          manual_entry?: boolean | null
          period_month?: string | null
          running_balance?: number
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          account_id?: string
          account_name?: string | null
          account_type?: string | null
          balance?: number | null
          created_at?: string
          credit?: number | null
          date?: string
          debit?: number | null
          description?: string | null
          id?: string
          is_manual_entry?: string | null
          journal_entry_id?: string | null
          manual_entry?: boolean | null
          period_month?: string | null
          running_balance?: number
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_saldo_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_locations: {
        Row: {
          branch_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          name: string
          radius: number
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          name: string
          radius?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          radius?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      hrd: {
        Row: {
          created_at: string
          id: string | null
        }
        Insert: {
          created_at?: string
          id?: string | null
        }
        Update: {
          created_at?: string
          id?: string | null
        }
        Relationships: []
      }
      inspection_checklist_values: {
        Row: {
          checklist_item_id: string | null
          created_at: string | null
          fine_amount: number | null
          id: string
          inspection_id: string | null
          notes: string | null
          status_after: string | null
          status_before: string | null
        }
        Insert: {
          checklist_item_id?: string | null
          created_at?: string | null
          fine_amount?: number | null
          id?: string
          inspection_id?: string | null
          notes?: string | null
          status_after?: string | null
          status_before?: string | null
        }
        Update: {
          checklist_item_id?: string | null
          created_at?: string | null
          fine_amount?: number | null
          id?: string
          inspection_id?: string | null
          notes?: string | null
          status_after?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checklist_values_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_checklist_values_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          category: string | null
          created_at: string | null
          fine_amount: number | null
          id: string
          inspection_id: string | null
          item_name: string | null
          notes: string | null
          status_before: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          fine_amount?: number | null
          id?: string
          inspection_id?: string | null
          item_name?: string | null
          notes?: string | null
          status_before?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          fine_amount?: number | null
          id?: string
          inspection_id?: string | null
          item_name?: string | null
          notes?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inspection_item"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          booking_id: string | null
          condition_notes: string | null
          created_at: string | null
          exterior_clean: boolean | null
          fee_breakdown: string | null
          fuel_level: string | null
          id: string
          inspection_type: string | null
          interior_clean: boolean | null
          odometer: number | null
          photo_urls: Json | null
          total_fees: number | null
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          condition_notes?: string | null
          created_at?: string | null
          exterior_clean?: boolean | null
          fee_breakdown?: string | null
          fuel_level?: string | null
          id?: string
          inspection_type?: string | null
          interior_clean?: boolean | null
          odometer?: number | null
          photo_urls?: Json | null
          total_fees?: number | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          condition_notes?: string | null
          created_at?: string | null
          exterior_clean?: boolean | null
          fee_breakdown?: string | null
          fuel_level?: string | null
          id?: string
          inspection_type?: string | null
          interior_clean?: boolean | null
          odometer?: number | null
          photo_urls?: Json | null
          total_fees?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      inventaris_kendaraan: {
        Row: {
          asuransi: string | null
          berakhir_asuransi: string | null
          berlaku_pajak: string | null
          berlaku_stnk: string | null
          bpkb_stnk: string | null
          bpkb_stnk_an: string | null
          created_at: string | null
          foto_belakang: string | null
          foto_bpkb: string | null
          foto_depan: string | null
          foto_interior: string | null
          foto_interior_depan: string | null
          foto_kanan_belakang: string | null
          foto_kiri_belakang: string | null
          foto_odometer: string | null
          foto_psk: string | null
          foto_samping_kana: string | null
          foto_samping_kanan: string | null
          foto_samping_kiri: string | null
          foto_stnk: string | null
          foto_tool_kit: string | null
          gage: string | null
          ganti_no_pol: string | null
          harga_sewa: number | null
          kep: string | null
          no_pol: string | null
          no_urut: number
          odo_akhir: number | null
          odo_awal: number | null
          perusahaan: string | null
          pos: string | null
          sheet_row_index: number | null
          status: string | null
          status_kendaraan: string | null
          status_vehicle: string | null
          tahun: string | null
          tanggal_berakhir: string | null
          tanggal_mulai: string | null
          type_unit: string | null
          updated_at: string | null
          vin: string | null
          warna: string | null
        }
        Insert: {
          asuransi?: string | null
          berakhir_asuransi?: string | null
          berlaku_pajak?: string | null
          berlaku_stnk?: string | null
          bpkb_stnk?: string | null
          bpkb_stnk_an?: string | null
          created_at?: string | null
          foto_belakang?: string | null
          foto_bpkb?: string | null
          foto_depan?: string | null
          foto_interior?: string | null
          foto_interior_depan?: string | null
          foto_kanan_belakang?: string | null
          foto_kiri_belakang?: string | null
          foto_odometer?: string | null
          foto_psk?: string | null
          foto_samping_kana?: string | null
          foto_samping_kanan?: string | null
          foto_samping_kiri?: string | null
          foto_stnk?: string | null
          foto_tool_kit?: string | null
          gage?: string | null
          ganti_no_pol?: string | null
          harga_sewa?: number | null
          kep?: string | null
          no_pol?: string | null
          no_urut: number
          odo_akhir?: number | null
          odo_awal?: number | null
          perusahaan?: string | null
          pos?: string | null
          sheet_row_index?: number | null
          status?: string | null
          status_kendaraan?: string | null
          status_vehicle?: string | null
          tahun?: string | null
          tanggal_berakhir?: string | null
          tanggal_mulai?: string | null
          type_unit?: string | null
          updated_at?: string | null
          vin?: string | null
          warna?: string | null
        }
        Update: {
          asuransi?: string | null
          berakhir_asuransi?: string | null
          berlaku_pajak?: string | null
          berlaku_stnk?: string | null
          bpkb_stnk?: string | null
          bpkb_stnk_an?: string | null
          created_at?: string | null
          foto_belakang?: string | null
          foto_bpkb?: string | null
          foto_depan?: string | null
          foto_interior?: string | null
          foto_interior_depan?: string | null
          foto_kanan_belakang?: string | null
          foto_kiri_belakang?: string | null
          foto_odometer?: string | null
          foto_psk?: string | null
          foto_samping_kana?: string | null
          foto_samping_kanan?: string | null
          foto_samping_kiri?: string | null
          foto_stnk?: string | null
          foto_tool_kit?: string | null
          gage?: string | null
          ganti_no_pol?: string | null
          harga_sewa?: number | null
          kep?: string | null
          no_pol?: string | null
          no_urut?: number
          odo_akhir?: number | null
          odo_awal?: number | null
          perusahaan?: string | null
          pos?: string | null
          sheet_row_index?: number | null
          status?: string | null
          status_kendaraan?: string | null
          status_vehicle?: string | null
          tahun?: string | null
          tanggal_berakhir?: string | null
          tanggal_mulai?: string | null
          type_unit?: string | null
          updated_at?: string | null
          vin?: string | null
          warna?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          customer_name: string
          date: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          date: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          date?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_vehicles: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          fuel_type: string | null
          id: number
          make: string | null
          model: string | null
          seats: number | null
          type: string | null
          year: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          fuel_type?: string | null
          id?: number
          make?: string | null
          model?: string | null
          seats?: number | null
          type?: string | null
          year?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          fuel_type?: string | null
          id?: number
          make?: string | null
          model?: string | null
          seats?: number | null
          type?: string | null
          year?: number | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          account_code: string | null
          account_id: string | null
          amount: number | null
          balance_total: number | null
          booking_id: string | null
          created_at: string
          credit: number | null
          date: string
          debit: number | null
          description: string
          entry_date: string | null
          entry_type: string | null
          id: string
          jurnal_id: string | null
          reference_id: string | null
          source_table: string | null
          total_debit: number | null
          transaction_date: string | null
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          account_id?: string | null
          amount?: number | null
          balance_total?: number | null
          booking_id?: string | null
          created_at?: string
          credit?: number | null
          date: string
          debit?: number | null
          description: string
          entry_date?: string | null
          entry_type?: string | null
          id?: string
          jurnal_id?: string | null
          reference_id?: string | null
          source_table?: string | null
          total_debit?: number | null
          transaction_date?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          account_id?: string | null
          amount?: number | null
          balance_total?: number | null
          booking_id?: string | null
          created_at?: string
          credit?: number | null
          date?: string
          debit?: number | null
          description?: string
          entry_date?: string | null
          entry_type?: string | null
          id?: string
          jurnal_id?: string | null
          reference_id?: string | null
          source_table?: string | null
          total_debit?: number | null
          transaction_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_jurnal_id_fkey"
            columns: ["jurnal_id"]
            isOneToOne: false
            referencedRelation: "jurnal"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_items: {
        Row: {
          account_id: string
          created_at: string
          credit: number | null
          debit: number | null
          id: string
          journal_entry_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_saldo_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "coa_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_items_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      jurnal: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string | null
          employee_id: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason: string
          start_date: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string | null
          driver_id: string | null
          id: string
          message: string
          metadata: Json | null
          payment_id: string | null
          read: boolean | null
          type: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          payment_id?: string | null
          read?: boolean | null
          type: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          payment_id?: string | null
          read?: boolean | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          bank: string | null
          bank_name: string | null
          booking_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_damage_payment: boolean | null
          is_partial_payment: string | null
          kode_booking: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          paid_amount: number | null
          payment_id: string | null
          payment_method: string | null
          plate_number: string | null
          remaining_payments: number | null
          status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          bank?: string | null
          bank_name?: string | null
          booking_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_damage_payment?: boolean | null
          is_partial_payment?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_method?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          bank?: string | null
          bank_name?: string | null
          booking_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_damage_payment?: boolean | null
          is_partial_payment?: string | null
          kode_booking?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_method?: string | null
          plate_number?: string | null
          remaining_payments?: number | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_api_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          id: number
          payload: Json
          response: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: number
          payload: Json
          response?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: number
          payload?: Json
          response?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action_id: string
          allowed: boolean
          created_at: string | null
          id: string
          module_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          action_id: string
          allowed?: boolean
          created_at?: string | null
          id?: string
          module_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          action_id?: string
          allowed?: boolean
          created_at?: string | null
          id?: string
          module_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      post_rental_inspections: {
        Row: {
          booking_id: string | null
          created_at: string | null
          damages: Json | null
          id: string
          notes: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          damages?: Json | null
          id?: string
          notes?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          damages?: Json | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_rental_inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      remaining_payments: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          paid_amount: number | null
          payment_id: string | null
          remaining_amount: number | null
          total_amount: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          paid_amount?: number | null
          payment_id?: string | null
          remaining_amount?: number | null
          total_amount?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          paid_amount?: number | null
          payment_id?: string | null
          remaining_amount?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_remaining_to_payments"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string | null
          role_id: number
          role_name: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          role_id?: number
          role_name?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          role_id?: number
          role_name?: string | null
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          shift_id: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          shift_id?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch: string
          capacity: number
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_recurring: boolean | null
          name: string
          recurring_days: string[] | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          start_time: string
          status: string
          updated_at: string | null
        }
        Insert: {
          branch: string
          capacity: number
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_recurring?: boolean | null
          name: string
          recurring_days?: string[] | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          start_time: string
          status: string
          updated_at?: string | null
        }
        Update: {
          branch?: string
          capacity?: number
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          recurring_days?: string[] | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sports_facilities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_per_hour: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_per_hour?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_per_hour?: number | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          address: string | null
          alamat: string | null
          created_at: string | null
          department: string | null
          email: string
          employee_id: string | null
          ethnicity: string | null
          first_name: string | null
          full_name: string | null
          id: string
          id_card_url: string | null
          kk_url: string | null
          ktp_number: string | null
          ktp_url: string | null
          last_name: string | null
          name: string
          nickname: string | null
          phone: string
          position: string | null
          relative_phone: string | null
          religion: string | null
          role: string | null
          role_id: number | null
          selfie_url: string | null
          sim_number: string | null
          skck_url: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          alamat?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          ethnicity?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          id_card_url?: string | null
          kk_url?: string | null
          ktp_number?: string | null
          ktp_url?: string | null
          last_name?: string | null
          name: string
          nickname?: string | null
          phone: string
          position?: string | null
          relative_phone?: string | null
          religion?: string | null
          role?: string | null
          role_id?: number | null
          selfie_url?: string | null
          sim_number?: string | null
          skck_url?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          alamat?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          ethnicity?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_card_url?: string | null
          kk_url?: string | null
          ktp_number?: string | null
          ktp_url?: string | null
          last_name?: string | null
          name?: string
          nickname?: string | null
          phone?: string
          position?: string | null
          relative_phone?: string | null
          religion?: string | null
          role?: string | null
          role_id?: number | null
          selfie_url?: string | null
          sim_number?: string | null
          skck_url?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_staff_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_accounts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          description: string
          id: string
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          name: string
          permissions: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles_backup: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          agama: string | null
          alamat: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string | null
          cv: string | null
          cv_url: string | null
          date_of_birth: string | null
          department: string | null
          driver_type: string | null
          education: string | null
          email: string | null
          employee_id: string | null
          ethnicity: string | null
          family_card_url: string | null
          family_phone_number: string | null
          first_name: string | null
          foto_kk: string | null
          foto_ktp: string | null
          foto_selfie: string | null
          fuel_type: string | null
          full_name: string | null
          id: string
          id_card_url: string | null
          kk_url: string | null
          ktp_address: string | null
          ktp_number: number | null
          ktp_url: string | null
          last_name: string | null
          license_expiry: string | null
          license_number: string | null
          license_plate: string | null
          license_rate: number | null
          phone: string | null
          phone_number: string | null
          phone_number_referensi: string | null
          place_of_birth: string | null
          position: string | null
          reference_phone: string | null
          relative_phone: string | null
          relative_phone_number: string | null
          religion: string | null
          role: string | null
          role_id: number | null
          role_name: string | null
          saldo: number | null
          selfie_photo_url: string | null
          selfie_url: string | null
          sim_expiry_date: string | null
          sim_number: number | null
          sim_url: string | null
          skck_url: string | null
          status: string | null
          stnk_url: string | null
          suku: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          transmission: string | null
          tribe: string | null
          updated_at: string | null
          username: string | null
          vehicle_brand: string | null
          vehicle_category: string | null
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_name: string | null
          vehicle_photo_url: string | null
          vehicle_status: string | null
          vehicle_type: string | null
          vehicle_year: string | null
        }
        Insert: {
          address?: string | null
          agama?: string | null
          alamat?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          cv?: string | null
          cv_url?: string | null
          date_of_birth?: string | null
          department?: string | null
          driver_type?: string | null
          education?: string | null
          email?: string | null
          employee_id?: string | null
          ethnicity?: string | null
          family_card_url?: string | null
          family_phone_number?: string | null
          first_name?: string | null
          foto_kk?: string | null
          foto_ktp?: string | null
          foto_selfie?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id: string
          id_card_url?: string | null
          kk_url?: string | null
          ktp_address?: string | null
          ktp_number?: number | null
          ktp_url?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          license_rate?: number | null
          phone?: string | null
          phone_number?: string | null
          phone_number_referensi?: string | null
          place_of_birth?: string | null
          position?: string | null
          reference_phone?: string | null
          relative_phone?: string | null
          relative_phone_number?: string | null
          religion?: string | null
          role?: string | null
          role_id?: number | null
          role_name?: string | null
          saldo?: number | null
          selfie_photo_url?: string | null
          selfie_url?: string | null
          sim_expiry_date?: string | null
          sim_number?: number | null
          sim_url?: string | null
          skck_url?: string | null
          status?: string | null
          stnk_url?: string | null
          suku?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          transmission?: string | null
          tribe?: string | null
          updated_at?: string | null
          username?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_name?: string | null
          vehicle_photo_url?: string | null
          vehicle_status?: string | null
          vehicle_type?: string | null
          vehicle_year?: string | null
        }
        Update: {
          address?: string | null
          agama?: string | null
          alamat?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          cv?: string | null
          cv_url?: string | null
          date_of_birth?: string | null
          department?: string | null
          driver_type?: string | null
          education?: string | null
          email?: string | null
          employee_id?: string | null
          ethnicity?: string | null
          family_card_url?: string | null
          family_phone_number?: string | null
          first_name?: string | null
          foto_kk?: string | null
          foto_ktp?: string | null
          foto_selfie?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          id_card_url?: string | null
          kk_url?: string | null
          ktp_address?: string | null
          ktp_number?: number | null
          ktp_url?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          license_rate?: number | null
          phone?: string | null
          phone_number?: string | null
          phone_number_referensi?: string | null
          place_of_birth?: string | null
          position?: string | null
          reference_phone?: string | null
          relative_phone?: string | null
          relative_phone_number?: string | null
          religion?: string | null
          role?: string | null
          role_id?: number | null
          role_name?: string | null
          saldo?: number | null
          selfie_photo_url?: string | null
          selfie_url?: string | null
          sim_expiry_date?: string | null
          sim_number?: number | null
          sim_url?: string | null
          skck_url?: string | null
          status?: string | null
          stnk_url?: string | null
          suku?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          transmission?: string | null
          tribe?: string | null
          updated_at?: string | null
          username?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_name?: string | null
          vehicle_photo_url?: string | null
          vehicle_status?: string | null
          vehicle_type?: string | null
          vehicle_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_roles"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      users_locations: {
        Row: {
          device_id: string | null
          full_name: string | null
          id: string
          latitude: number | null
          longitude: number | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          device_id?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vehicle_types: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          available: boolean | null
          basic_price: string | null
          category: string | null
          color: string | null
          created_at: string | null
          daily_rate: string | null
          driver_id: string | null
          features: Json | null
          fuel_type: string | null
          id: string
          image: string | null
          image_url: string | null
          is_active: boolean | null
          is_available: string | null
          is_booked: boolean | null
          is_with_driver: boolean | null
          license_plate: string | null
          make: string
          mileage: string | null
          model: string
          name: string | null
          plate_number: string | null
          price: number
          price_km: number | null
          seats: number | null
          sheet_row_index: number | null
          status: string | null
          stnk_expiry: string | null
          stnk_url: string | null
          surcharge: string | null
          tax_expiry: string | null
          transmission: string | null
          type: string | null
          updated_at: string | null
          vehicle_status: string | null
          vehicle_type_id: number | null
          year: number | null
        }
        Insert: {
          available?: boolean | null
          basic_price?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          daily_rate?: string | null
          driver_id?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          image?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_available?: string | null
          is_booked?: boolean | null
          is_with_driver?: boolean | null
          license_plate?: string | null
          make: string
          mileage?: string | null
          model: string
          name?: string | null
          plate_number?: string | null
          price: number
          price_km?: number | null
          seats?: number | null
          sheet_row_index?: number | null
          status?: string | null
          stnk_expiry?: string | null
          stnk_url?: string | null
          surcharge?: string | null
          tax_expiry?: string | null
          transmission?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_status?: string | null
          vehicle_type_id?: number | null
          year?: number | null
        }
        Update: {
          available?: boolean | null
          basic_price?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          daily_rate?: string | null
          driver_id?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          image?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_available?: string | null
          is_booked?: boolean | null
          is_with_driver?: boolean | null
          license_plate?: string | null
          make?: string
          mileage?: string | null
          model?: string
          name?: string | null
          plate_number?: string | null
          price?: number
          price_km?: number | null
          seats?: number | null
          sheet_row_index?: number | null
          status?: string | null
          stnk_expiry?: string | null
          stnk_url?: string | null
          surcharge?: string | null
          tax_expiry?: string | null
          transmission?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_status?: string | null
          vehicle_type_id?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      work_areas: {
        Row: {
          city_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          city_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          city_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      work_places: {
        Row: {
          created_at: string | null
          id: string
          name: string
          work_area_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          work_area_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          work_area_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_places_work_area_id_fkey"
            columns: ["work_area_id"]
            isOneToOne: false
            referencedRelation: "work_areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      balance_sheet_view: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          saldo: number | null
          total_credit: number | null
          total_debit: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
      bookings_view: {
        Row: {
          additional_data: Json | null
          created_at: string | null
          details: string | null
          id: string | null
          kode_booking: string | null
          name: string | null
          price: number | null
          quantity: number | null
          service_type: string | null
          status: string | null
          tanggal: string | null
          total_amount: number | null
        }
        Insert: {
          additional_data?: never
          created_at?: string | null
          details?: string | null
          id?: string | null
          kode_booking?: string | null
          name?: string | null
          price?: number | null
          quantity?: never
          service_type?: string | null
          status?: never
          tanggal?: string | null
          total_amount?: number | null
        }
        Update: {
          additional_data?: never
          created_at?: string | null
          details?: string | null
          id?: string | null
          kode_booking?: string | null
          name?: string | null
          price?: number | null
          quantity?: never
          service_type?: string | null
          status?: never
          tanggal?: string | null
          total_amount?: number | null
        }
        Relationships: []
      }
      coa_balances: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          id: string | null
          saldo: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      coa_saldo_view: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          id: string | null
          saldo: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      coa_summary: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          saldo: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      coa_summary_view: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          current_balance: number | null
          id: string | null
          total_credit: number | null
          total_debit: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
      profit_loss_view: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          net_value: number | null
          total_credit: number | null
          total_debit: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_table_info: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
        }[]
      }
      process_journal_entry: {
        Args:
          | {
              _account_code: string
              _total_debit: number
              _total_credit: number
              _description: string
            }
          | { p_journal_entry_id: string }
        Returns: undefined
      }
      update_all_account_totals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_coa_balance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_general_ledger: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      transfer_status: "pending" | "confirmed" | "completed" | "canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      transfer_status: ["pending", "confirmed", "completed", "canceled"],
    },
  },
} as const
